import {Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Project, ResourceInstance, ResourceType} from "@qpa/core";
import {_TagService} from "./internal/_tag_service.ts";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {Provider, ResourceService} from "@qpa/core/spi";
import {retry, handleAll, ConstantBackoff, Policy, wrap, timeout, TimeoutStrategy} from 'cockatiel';
import {ClientConfig as tc_ClientConfig} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";

export abstract class _TencentCloudResourceService<SPEC, STATE> extends ResourceService<SPEC, STATE> {
  protected constructor() {
    super();
  }

  abstract get resourceType(): TencentCloudType ;
}

export interface TencentCloudCredential extends tc_Credential {
}

/**
 * 支持tag的资源 Taggable
 */
export abstract class _TaggableResourceService<SPEC, STATE> extends _TencentCloudResourceService<SPEC, STATE> {
  protected constructor() {
    super();
  }

  /**
   * 调用此接口的上层应用应保证做好分页分批查询，这样子类就不需要考虑分页，只需把limit放到查询接口
   */
  abstract findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<STATE>[]> ;

}

/**
 * serviceType&resourcePrefix 是tag api 的术语，也是腾讯云资源urn的术语
 * [支持标签 API 的资源类型](https://cloud.tencent.com/document/product/651/89122)
 *
 * 不可变类型.
 *
 * 资源六段式列表。腾讯云使用资源六段式描述一个资源。
 * 例如：ResourceList.1 = qcs::{ServiceType}:{Region}:{Account}:{ResourcePrefix}/${ResourceId}。
 */
export class TencentCloudType implements ResourceType {
  private static _types = new Map<string, TencentCloudType>();
  static vpc_vpc = TencentCloudType.put("vpc", "vpc", 100, 100, [])
  static vpc_subnet = TencentCloudType.put("vpc", "subnet", 100, 100, [TencentCloudType.vpc_vpc])
  static cvm_instance = TencentCloudType.put("cvm", "instance", 100, 100, [TencentCloudType.vpc_subnet, TencentCloudType.vpc_vpc]) // ref: DescribeInstancesRequest

  /**
   * 私有构造函数，防止外部直接 new跨过注册过程
   */
  private constructor(
    readonly serviceType: string,
    readonly resourcePrefix: string,
    /**
     * 分页查询时每页的最大数量。
     * @remark 此值需人工在每个请求API的文档中确认其最大限制。
     */
    readonly queryLimit: number,
    /**
     * 一次批量删除的最大上限。
     * @remark 此值需人工在每个请求API的文档中确认其最大限制。
     */
    readonly deleteLimit: number,
    /**
     * 依赖项, 比如cvm_instance依赖vpc_subnet和vpc_vpc。
     * @remark 此值需人工在每个请求API的文档中确认其最大限制。
     */
    readonly dependencies: TencentCloudType[]) {
  }

  static _name(serviceType?: string, resourcePrefix?: string): string {
    return `${serviceType ?? ""}_${resourcePrefix ?? ""}`;
  }

  get name(): string {
    return TencentCloudType._name(this.serviceType, this.resourcePrefix);
  }

  /**
   * 静态工厂方法创建实例
   */
  private static put(serviceType: string,
                     resourcePrefix: string,
                     pageLimit: number,
                     deleteLimit: number,
                     dependencies: TencentCloudType[]
  ): TencentCloudType {
    // 更严格的类型检查
    if (serviceType && serviceType.trim() === '') {
      throw new Error('ServiceType must be a non-empty string');
    }

    if (resourcePrefix && resourcePrefix.trim() === '') {
      throw new Error('ResourcePrefix must be a non-empty string');
    }

    const key = TencentCloudType._name(serviceType, resourcePrefix);
    const found = TencentCloudType._types.get(key);

    if (found) {
      throw new Error(`ResourceType重复注册,已存在: ${found} `);
    }
    //注册不存在的类型
    const result = new TencentCloudType(serviceType, resourcePrefix, pageLimit, deleteLimit, dependencies);
    TencentCloudType._types.set(key, result);
    return result;
  }

  static get types(): ReadonlyMap<string, TencentCloudType> {
    return TencentCloudType._types;
  }

  toString(): string {
    return this.name;
  }

  static find(serviceType?: string, resourcePrefix?: string): TencentCloudType | undefined {
    return TencentCloudType._types.get(TencentCloudType._name(serviceType ?? "", resourcePrefix ?? ""));
  }
}

export interface TencentCloudProviderProps {
  credential: TencentCloudCredential

}

/**
 * @internal
 * 无状态服务提供者
 *
 * 这里的方法不应该被客户程序直接执行，应该通过Project.apply()等执行
 *
 *
 */
export class _TencentCloudProvider extends Provider {
  readonly services = new _Services();
  private readonly credential: TencentCloudCredential;
  private readonly tagService: _TagService;
  readonly runners:_Runners=new _Runners();
  constructor(readonly project: Project, props: TencentCloudProviderProps) {
    super(project);
    this.credential = props.credential;
    const tagClient = new tc_TagClient({
      credential: props.credential,
    });

    this.tagService = new _TagService(project, tagClient);
  }

  /**
   */
  async findResourceInstances(): Promise<ResourceInstance<unknown>[]> {
    return this.tagService.findResourceInstances(this);
  }

  public getClientConfigByRegion(region: string): tc_ClientConfig {
    return {
      credential: this.credential,
      region: region,
    }
  }

  _getService(type: TencentCloudType): _TencentCloudResourceService<unknown, unknown> {
    const result = this.services.get(type);
    if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或放弃使用此资源类型`);
    return result;
  }
}

class _Services extends Map<TencentCloudType, _TencentCloudResourceService<unknown, unknown>> {
  constructor(...args: [TencentCloudType, _TencentCloudResourceService<unknown, unknown>][]) {
    super(args);
    // 确保原型链正确
    Object.setPrototypeOf(this, _Services.prototype);
  }

  register(service: _TencentCloudResourceService<unknown, unknown>) {
    const type = service.resourceType;
    if (this.has(type)) {
      throw Error(`resource service[${type}] already registered`);
    }
    this.set(type, service);
  }
}


/**
 * 集中配置Retry的工具类
 */
export class _Runners {

  /**
   * 等待资源删除完成的策略
   */
  removeResourceWaiting(policy?: Policy) {
    return wrap(
      retry(
        policy ?? handleAll, // handle all errors
        {maxAttempts: 50, backoff: new ConstantBackoff(100)}, // retry three times, with no backoff
      ),
      timeout(15000, TimeoutStrategy.Aggressive),
    );
  }
}
