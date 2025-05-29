import {ClientConfig, Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Provider, ResourceService, ResourceInstance, Project, Resource, ResourceConfig,} from "@qpa/core";
import {TagService} from "./internal/_tag_service.ts";

export abstract class TencentCloudResourceService<SPEC, STATE> extends ResourceService<SPEC, STATE> {

}

export interface TencentCloudCredential extends tc_Credential {
}

/**
 * 支持tag的资源 Taggable
 */
export abstract class TaggableResourceService<SPEC, STATE> extends TencentCloudResourceService<SPEC, STATE> {
  /**
   * 调用此接口的上层应用应保证做好分页分批查询，这样子类就不需要考虑分页，只需把limit放到查询接口
   */
  abstract findOnePageByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<STATE>[]> ;

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

  // 私有构造函数，防止外部直接 new
  private constructor(
    readonly serviceType: string,
    readonly resourcePrefix: string,
    // public readonly createService: (provider: TencentCloudProvider) => TencentCloudTaggedResourceService,
    readonly pageLimit: number
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

  // 获取唯一标识符
  toString(): string {
    return `${this.serviceType}:${this.resourcePrefix}-limit:${this.pageLimit}`;
  }

  static find(serviceType?: string, resourcePrefix?: string): TencentCloudType | undefined {
    return TencentCloudType._types.find(e => e.serviceType === serviceType && e.resourcePrefix === resourcePrefix);
  }
}

export interface TencentCloudProviderProps {
  credential: TencentCloudCredential;
  serviceRegister: (provider: TencentCloudProvider) => Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>>;
}

/**
 * 这里的方法不应该被客户程序直接执行，应该通过Project.apply()等执行
 */
export class TencentCloudProvider extends Provider {
  /**
   * @internal
   */
  readonly _resourceServices: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>>;
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

    this._resourceServices = props.serviceRegister(this);

    if (this._resourceServices.size === 0) {
      throw Error("请提供您项目所要支持的资源服务列表，目前您支持的资源服务列表为空")
    }
    for (const type of TencentCloudType.types) {
      if (!this._resourceServices.has(type)) {
        throw Error(`bug:assert qpa internal bug,ResourceType ${type} 未注册相应的ResourceService`)
      }
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
  get resourceInstances(): readonly ResourceInstance<unknown>[] {
    return this._resourceInstances;
  }

  _getService(type: TencentCloudType): TencentCloudResourceService<unknown, unknown> {
    const result = this._resourceServices.get(type);
    if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或放弃使用此资源类型`);
    return result;
  }

  async findResourceInstances(): Promise<ResourceInstance<unknown>[]> {
    return this.tagService.findResourceInstances();
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
    await this.refresh();

    const undeclaredResourcePendingToDelete = this._resourceInstances.filter(e => {
      const declared = this._resources.get(e.name);
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
    await this.refresh();
    const safeCopy = this._resourceInstances.slice()
    for (const instance of safeCopy) {
      await instance.destroy();
      this._resourceInstances.delete(instance);
    }
  }


  async apply<TSpec, TState>(expected: ResourceConfig<TSpec>, type: TencentCloudType): Promise<Resource<TSpec, TState>> {
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
    this._resources.set(result.name, result);
    return result;
  }
}

class ResourceInstances extends Array<ResourceInstance<unknown>> {
  constructor(...args: ResourceInstance<unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
    //typescript原型链修复
    Object.setPrototypeOf(this, ResourceInstances.prototype);
  }

  delete(instance: ResourceInstance<unknown>) {
    const index = this.indexOf(instance); // 查找 'banana' 的索引
    if (index !== -1) {
      this.splice(index, 1); // 删除该元素
    }
  }
}

class Resources extends Map<string, Resource<unknown, unknown>> {
  constructor(...args: [string, Resource<unknown, unknown>][]) {
    super(args);
    //typescript原型链修复
    Object.setPrototypeOf(this, Resources.prototype);

  }
}