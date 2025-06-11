import {ClientConfig, Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Project, ProviderRuntime, ResourceInstance, ResourceType} from "@qpa/core";
import {TagService} from "./internal/_tag_service.ts";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {Provider, ResourceService} from "@qpa/core/spi";

export abstract class _TencentCloudResourceService<SPEC, STATE> extends ResourceService<SPEC, STATE> {
  protected constructor() {
    super();
  }
  abstract get resourceType(): TencentCloudType ;
}

export interface _TencentCloudAware {
  tagClient: tc_TagClient;

  _getClientConfigByRegion(region: string): ClientConfig;

  _project: Project;
  _provider: _TencentCloudProvider;
  _services: Map<TencentCloudType, _TencentCloudResourceService<unknown, unknown>>;

}

// fixme remove?
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
  private static _types: TencentCloudType[] = [];
  static vpc_vpc = TencentCloudType.put("vpc", "vpc", 100, [])
  static vpc_subnet = TencentCloudType.put("vpc", "subnet", 100, [TencentCloudType.vpc_vpc])
  static cvm_instance = TencentCloudType.put("cvm", "instance", 100, [TencentCloudType.vpc_subnet, TencentCloudType.vpc_vpc]) // ref: DescribeInstancesRequest

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
    readonly pageLimit: number,
    /**
     * 依赖项, 比如cvm_instance依赖vpc_subnet和vpc_vpc。
     * @remark 此值需人工在每个请求API的文档中确认其最大限制。
     */
    readonly dependencies: TencentCloudType[]) {
  }

  get name(): string {
    return `${this.serviceType}_${this.resourcePrefix}`;
  }

  /**
   * 静态工厂方法创建实例
   */
  private static put(serviceType: string,
                     resourcePrefix: string,
                     pageLimit: number,
                     dependencies: TencentCloudType[]
  ): TencentCloudType {
    // 更严格的类型检查
    if (serviceType && serviceType.trim() === '') {
      throw new Error('ServiceType must be a non-empty string');
    }

    if (resourcePrefix && resourcePrefix.trim() === '') {
      throw new Error('ResourcePrefix must be a non-empty string');
    }

    const result = new TencentCloudType(serviceType, resourcePrefix, pageLimit, dependencies);
    const key = result.toString();
    const found = TencentCloudType._types.find(e => e.toString() === key);
    if (found) {
      throw new Error(`ResourceType重复注册,已存在: ${found} `);
    }
    //注册不存在的类型
    TencentCloudType._types.push(result);
    return result;
  }

  static get types(): readonly TencentCloudType[] {
    return TencentCloudType._types;
  }

  toString(): string {
    return this.name;
  }

  static find(serviceType?: string, resourcePrefix?: string): TencentCloudType | undefined {
    return TencentCloudType._types.find(e => e.serviceType === serviceType && e.resourcePrefix === resourcePrefix);
  }
}

/**
 * 无状态服务提供者
 *
 * 这里的方法不应该被客户程序直接执行，应该通过Project.apply()等执行
 */
export class _TencentCloudProvider extends Provider {
  private tagService: TagService;
  private _services: Map<TencentCloudType, _TencentCloudResourceService<unknown, unknown>>;

  /**
   * @private
   */
  constructor(project: Project, tc: _TencentCloudAware,   services: Map<TencentCloudType, _TencentCloudResourceService<unknown, unknown>>) {
    super();

    this.tagService = new TagService(project, tc);
    this._services=services;
  }

  get services(): ReadonlyMap<TencentCloudType, ResourceService<unknown, unknown>> {
    return this._services;
  }

  /**
   * @override
   */
  async findResourceInstances(): Promise<ResourceInstance<unknown>[]> {
    return this.tagService.findResourceInstances();
  }

  /**
   * @override
   */
  dependences(): Map<TencentCloudType, TencentCloudType[]> {
    return new Map([
      [TencentCloudType.cvm_instance, [TencentCloudType.vpc_vpc, TencentCloudType.vpc_subnet]],
      [TencentCloudType.vpc_subnet, [TencentCloudType.vpc_vpc]],
    ]);
  }
}


export abstract class BaseServiceFactory {
  protected constructor(protected _tc: _TencentCloudAware) {

  }

  protected get _provider() {
    return this._tc._provider;
  }

  protected get _providerState(): ProviderRuntime {
    const result = this._tc._project._providers.get(this._provider);
    if (!result) {
      throw new Error("provider need register to Project")
    }
    return result;
  }

  protected _getService(type: TencentCloudType): _TencentCloudResourceService<unknown, unknown> {
    const result = this._tc._services.get(type);
    if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或放弃使用此资源类型`);
    return result;
  }
}