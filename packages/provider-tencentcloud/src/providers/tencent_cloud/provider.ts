import {ClientConfig, Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {Provider, ResourceService, ResourceInstance, Project, Resource,} from "@qpa/core";
import {TagService} from "./tag_service.ts";

export abstract class TencentCloudResourceService<SPEC, STATE> extends ResourceService<SPEC, STATE> {

}

export interface TencentCloudCredential extends tc_Credential {
}

/**
 * 支持tag的资源 Taggable
 */
export abstract class TaggableResourceService<SPEC, STATE> extends TencentCloudResourceService<SPEC, STATE> {
  abstract findByTags(resourceTags: ResourceTag[]): Promise<ResourceInstance<STATE>[]>;
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
export class ResourceType {
  private static _types = new Array<ResourceType>();

  // 私有构造函数，防止外部直接 new
  private constructor(
    public readonly serviceType: string,
    public readonly resourcePrefix: string,
    // public readonly createService: (provider: TencentCloudProvider) => TencentCloudTaggedResourceService,
  ) {
  }

  // 静态工厂方法创建实例
  static of(props: {
    serviceType: string;
    resourcePrefix: string;
  }): ResourceType {
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

    const result = new ResourceType(props.serviceType, props.resourcePrefix);
    const key = result.toString();
    const found = ResourceType._types.find(e => e.toString() === key);
    if (found) {
      return found;
    }
    ResourceType._types.push(result);
    return result;
  }

  static get types(): ReadonlyArray<ResourceType> {
    ResourceType.checkInit();
    return ResourceType._types;
  }

  private static checkInit() {
    if (ResourceType._types.length === 0) {
      throw Error("ResourceType not init")
    }
  }

  // 获取唯一标识符
  toString(): string {
    return `${this.serviceType}:${this.resourcePrefix}`;
  }

  static find(serviceType?: string, resourcePrefix?: string): ResourceType | undefined {
    ResourceType.checkInit();
    return ResourceType._types.find(e => e.serviceType === serviceType && e.resourcePrefix === resourcePrefix);
  }
}

export interface TencentCloudProviderProps {
  credential: TencentCloudCredential;
  allowedResourceServices: (provider: TencentCloudProvider) => Map<ResourceType, TencentCloudResourceService<unknown, unknown>>;
}

/**
 * 这里的方法不应该被客户程序直接执行，应该通过Project.apply()等执行
 *
 * todo 还未考虑如何把api和spi隔离开
 */
export class TencentCloudProvider extends Provider {
  /**
   * @internal
   */
  readonly _resourceServices: Map<ResourceType, TencentCloudResourceService<unknown, unknown>>;
  public credential!: TencentCloudCredential;
  _resourceInstances: ResourceInstances = new ResourceInstances();
  _resources: Resources = new Resources();
  private tagService: TagService;

  /**
   * @private
   */
  private constructor(readonly project: Project, readonly props: TencentCloudProviderProps) {
    super();

    this.credential = props.credential;
    this.tagService = new TagService(this);

    this._resourceServices = props.allowedResourceServices(this);
    if (this._resourceServices.size === 0) {
      throw Error("请提供您项目所要支持的资源服务列表，目前您支持的资源服务列表为空")
    }

  }

  /**
   * 创建并注册TencentCloudProvider到Project.providers
   * @public
   * */
  static of(project: Project, props: TencentCloudProviderProps): TencentCloudProvider {
    const result = new TencentCloudProvider(project, props);
    //放到最后执行，避免因构造check失败而抛出异常，但却把this加入到{@link Project.providers | 提供者集合} 中
    project.providers.add(result);
    return result;
  }

  /**
   * 云上实际的资源实例集合
   */
  get resourceInstances(): ResourceInstances {
    return this._resourceInstances;
  }

  _getService(type: ResourceType): TencentCloudResourceService<unknown, unknown> {
    const result = this._resourceServices.get(type);
    if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或禁用此资源类型`);
    return result;
  }

  async findResourceInstances(): Promise<ResourceInstance<unknown>[]> {
    return this.tagService.findActualResourceStates();
  }

  public _getClientConfigByRegion(region: string): ClientConfig {
    return {
      credential: this.credential,
      region: region,
    }
  }
  /**
   * **SPI 方法**，不应被客户程序执行
   */
  async refresh(): Promise<void> {
    this._resourceInstances = new ResourceInstances(...await this.findResourceInstances());
  }

  /**
   * **SPI 方法**，不应被客户程序执行
   */
  async cleanup(): Promise<void> {
    const undeclaredResourcePendingToDelete= this._resourceInstances.filter(e=>{
      const declared=this._resources.get(e.name);
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
  async destroy(): Promise<void> {
    for (const instance of this._resourceInstances) {
      await instance.destroy();
    }
  }

}

class ResourceInstances extends Array<ResourceInstance<unknown>> {
  constructor(...args: ResourceInstance<unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}
class Resources extends Map<string,Resource<unknown, unknown>> {
constructor(...args: [string, Resource<unknown, unknown>][]) {
  super(args);
}
}