import {ClientConfig, Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {ResourceInstances, Project, Provider, ProviderState, Resource, ResourceConfig, ResourceInstance, ResourceService,} from "@qpa/core";
import {TagService} from "./internal/_tag_service.ts";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";

export abstract class TencentCloudResourceService<SPEC, STATE> extends ResourceService<SPEC, STATE> {
  protected constructor() {
    super();
  }

  abstract get resourceType(): TencentCloudType ;
}

export interface _TencentCloudAware {
  tagClient: tc_TagClient;

  _getClientConfigByRegion(region: string): ClientConfig;

  _project: Project;
  _provider: TencentCloudProvider;

}

// fixme remove?
export interface TencentCloudCredential extends tc_Credential {
}

/**
 * 支持tag的资源 Taggable
 */
export abstract class TaggableResourceService<SPEC, STATE> extends TencentCloudResourceService<SPEC, STATE> {
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
 * 例如：ResourceList.1 = qcs::{ServiceType}:{Region}:{Account}:{ResourcePreifx}/${ResourceId}。
 */
export class TencentCloudType {
  private static _types: TencentCloudType[] = [];
  static vpc_vpc = TencentCloudType.put({serviceType: "vpc", resourcePrefix: "vpc", pageLimit: 100})
  static vpc_subnet = TencentCloudType.put({serviceType: "vpc", resourcePrefix: "subnet", pageLimit: 100})
  static cvm_instance = TencentCloudType.put({serviceType: "cvm", resourcePrefix: "instance", pageLimit: 100}) //todo 确认limit

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
  ) {
  }

  // 静态工厂方法创建实例
  static put(props: {
    serviceType: string;
    resourcePrefix: string;
    pageLimit: number;
  }): TencentCloudType {
    // 更严格的类型检查
    if (!props || typeof props !== 'object') {
      throw new Error('Props must be an object');
    }

    if (props.serviceType && props.serviceType.trim() === '') {
      throw new Error('ServiceType must be a non-empty string');
    }

    if (props.resourcePrefix && props.resourcePrefix.trim() === '') {
      throw new Error('ResourcePrefix must be a non-empty string');
    }

    const result = new TencentCloudType(props.serviceType, props.resourcePrefix, props.pageLimit);
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
    return `${this.serviceType}:${this.resourcePrefix}`;
  }

  static find(serviceType?: string, resourcePrefix?: string): TencentCloudType | undefined {
    return TencentCloudType._types.find(e => e.serviceType === serviceType && e.resourcePrefix === resourcePrefix);
  }
}

export interface TencentCloudProviderProps {
  services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>>;
}

/**
 * 无状态服务提供者
 *
 * 这里的方法不应该被客户程序直接执行，应该通过Project.apply()等执行
 */
export class TencentCloudProvider extends Provider {
  /**
   * @internal
   */
  readonly _resourceServices: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>>;
  private tagService: TagService;

  /**
   * @private
   */
  constructor(project: Project, tc: _TencentCloudAware, readonly props: TencentCloudProviderProps) {
    super();

    this.tagService = new TagService(project, this, tc);

    this._resourceServices = props.services;

    if (this._resourceServices.size === 0) {
      throw Error("请提供您项目所要支持的资源服务列表，目前您支持的资源服务列表为空")
    }
    for (const type of TencentCloudType.types) {
      if (!this._resourceServices.has(type)) {
        throw Error(`bug:assert qpa internal bug,ResourceType ${type} 未注册相应的ResourceService`)
      }
    }
  }

  _getService(type: TencentCloudType): TencentCloudResourceService<unknown, unknown> {
    const result = this._resourceServices.get(type);
    if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或放弃使用此资源类型`);
    return result;
  }

  async findResourceInstances(state: ProviderState): Promise<ResourceInstance<unknown>[]> {
    return this.tagService.findResourceInstances();
  }


  /**
   * **SPI 方法**，不应被客户程序执行
   */
  async refresh(state: ProviderState): Promise<void> {
    state._resourceInstances = new ResourceInstances(...await this.findResourceInstances(state));
  }

  /**
   * **SPI 方法**，不应被客户程序执行
   */
  async cleanup(state: ProviderState): Promise<void> {
    await this.refresh(state);

    const undeclaredResourcePendingToDelete = state._resourceInstances.filter(e => {
      const declared = state._resources.get(e.name);
      return !declared;
    });
    // todo 需要按类型顺序删除
    for (const instance of undeclaredResourcePendingToDelete) {
      await instance.destroy();
    }
  }

  /**
   * **SPI 方法**，不应被客户程序执行
   */
  async destroy(state: ProviderState): Promise<void> {
    await this.refresh(state);
    const safeCopy = state._resourceInstances.slice()
    for (const instance of safeCopy) {
      await instance.destroy();
      state._resourceInstances.delete(instance);
    }
  }


  async apply<TSpec, TState>(state: ProviderState, expected: ResourceConfig<TSpec>, type: TencentCloudType): Promise<Resource<TSpec, TState>> {
    const service = this._getService(type) as ResourceService<TSpec, TState>;

    let actual = await service.load(expected);
    if (actual.length == 0) {
      actual = [await service.create(expected)];
    }
    if (actual.length === 0) {
      throw new Error(`bug: 应该不会发生, 可能是QPA的bug, 资源${expected.name}的实际资源实例数量应该不为0, 但是目前为0 `)
    }

    if (actual.length > 1) {
      throw new Error(`名为(${expected.name})的资源, 发现重复/冲突资源实例(Duplicate/Conflicting Resources): 可能是重复创建等故障导致同名冲突实例，需要您手工清除或执行destroy后apply重建,冲突实例：${actual.map(e => e.toJson())}`)
    }

    const result = new Resource(expected, actual);
    state._resources.set(result.name, result);
    return result;
  }
}


export abstract class BaseServiceFactory {
  protected constructor(protected _tc: _TencentCloudAware) {

  }

  protected get _provider() {
    return this._tc._provider;
  }

  protected get _providerState(): ProviderState {
    const result = this._tc._project._providers.get(this._provider);
    if (!result) {
      throw new Error("provider need register to Project")
    }
    return result;
  }


}