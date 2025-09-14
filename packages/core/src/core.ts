import {Provider, ResourceService} from "./spi/provider.ts";
import {topologicalSortDFS} from "./internal/_common.ts";

export abstract class BaseProject {
  public name: string;

  protected constructor(props: { name: string }) {
    this.name = props.name;
  }
}

/**
 * 实际资源，包含
 * - state字段: 特定于云厂商的实际资源状态信息，数据结构以云api资源数据结构为基础,可能会增加一些字段,比如region
 * - 其他字段：云上资源从tag等提取出的QPA元信息，比如resource_name等
 */
export class ResourceInstance<STATE> {
  private readonly resourceService: ResourceService<unknown, STATE>;
  readonly resourceType: ResourceType;

  /**
   * @internal
   */
  constructor(resourceService: ResourceService<unknown, STATE>, readonly name: string, readonly state: STATE) {
    this.resourceService = resourceService;
    this.resourceType = resourceService.resourceType;
  }

  async destroy(): Promise<void> {
    await this.resourceService.delete(this);
  }

  toJson() {
    return JSON.stringify({name: this.name, state: this.state});
  }
}


/**
 * Resource Config is a resource's configuration part, which is the desired state
 *
 * 指资源的配置部分，即渴望的状态 (Desired State)
 */
export interface ResourceConfig<SPEC> {
  /** in a resource type, name is unique ,like k8s name/terraform name field*/
  name: string;
  /** 特定于厂商的资源规格定义 */
  spec: SPEC;
}

export interface ResourceType {
  /**
   * CN: 唯一的资源类型名
   * EN: unique resource type name
   */
  get name(): string;

  /**
   *
   * CN: 依赖项，比如 vm 依赖 vpc,subnet
   * EN: dependencies, examples: vm dependencies is vpc,subnet
   */
  get dependencies(): ResourceType[];
}


/**
 * 一个完整的受管理资源，包括
 * - expected: 资源配置(定义期望的规格状态)
 * - actual: 对应的以资源名为映射关系的的多个同名实际资源实例(正常应该只有一个,但可能有重复create的问题资源)
 *
 * 资源的最终状态，LazyResource加载后也会变成完全体的Resource
 */
export class Resource<SPEC, STATE> {

  // todo actual要改为单数，集合放到核心api有点难以理解和应用，这个类就应该是完整的
  constructor(readonly expected: ResourceConfig<SPEC>, readonly actual: ResourceInstance<STATE>[]) {
    if (actual.length == 0) {
      throw new Error("Resource为非惰性资源，创建Resource必须提供对应云上实例");
    }
    for (const instance of actual) {
      if (expected.name !== instance.name) {
        throw new Error(`expected.name(${expected.name})必须和实际资源实例的name(${instance.name})一致`);
      }
    }
  }

  /**
   * name 是区分资源的关键, 我们会把name 用tag的形式打在每个实际的资源上, 以此对齐声明的资源配置和实际资源实例
   */
  get name(): string {
    return this.expected.name;
  }

  get actualInstance() {
    if (this.actual.length != 1) {
      throw new Error(`正常资源应该对应云上1个云上实际实例，但现在有${this.actual.length}个,请检查:${this.actual.map(it => (it.toJson()))}`);
    }
    return this.actual[0];
  }

}

export interface ProjectProps {
  name: string;
}

export type Apply = (project: Project) => Promise<void>;

/**
 * SPI 接口，并不直接暴露给api客户程序。
 *
 *
 * 实现Provider的公共逻辑有2种方式：
 * 1. 使用继承：用父类型实现对资源的管理公共逻辑
 * 2. 使用隔离的组合composite模型
 *
 * ProviderRuntime的逻辑原先用继承实现，由Provider父类型提供公共逻辑，我们拆离为组合模式，这样SPI实现者只关注Provider的接口实现即可
 * 避免SPI客户面对ProviderRuntime和云实现无关的接口，减少信息过载
 */
export class ProviderRuntime<T extends Provider> {
  /**
   * @internal
   * */
  _resourceInstances: __ResourceInstances = new __ResourceInstances();
  /**
   * @internal
   * */
  _resources: __Resources = new __Resources();
  private sortedResourceTypesCache!: ResourceType[];

  constructor(readonly provider: T) {
  }

  get project(): Project {
    return this.provider.project;
  }

  private get sortedResourceTypes(): ResourceType[] {
    // init
    if (!this.sortedResourceTypesCache) {
      const resourceTypeDependencies = new Map<ResourceType, ResourceType[]>();
      for (const [type, _] of this.provider.resourceServices) {
        resourceTypeDependencies.set(type, type.dependencies);
      }
      this.sortedResourceTypesCache = topologicalSortDFS(resourceTypeDependencies);
    }

    return this.sortedResourceTypesCache;
  }

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   **/
  async refresh(): Promise<void> {
    this._resourceInstances = new __ResourceInstances(...await this.provider.findResourceInstances());
  }

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 因为清理方法是apply的最后一步，此方法必须在外部调用完apply后才能使用。
   *
   * 清理待删除资源(Pending Deletion Instances)
   * 服务提供者Provider应确保此方法内部先获取最新的实际资源实例，再删除所有Pending Deletion Instances
   * 不应期待外部调用者获取最新状态
   * */
  async cleanup(): Promise<void> {
    await this.refresh();

    const undeclaredResourcePendingToDelete = this._resourceInstances.filter(e => {
      const declared = this._resources.get(e.name);
      return !declared;
    });
    return this.removeResourceInstances(undeclaredResourcePendingToDelete);
  }

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 销毁所有实际存在的资源实例
   * */
  async destroy(): Promise<void> {
    await this.refresh();
    const safeCopy = this._resourceInstances.slice()
    await this.removeResourceInstances(safeCopy);
    // todo 这里是否应该每删除一个instance就删除一个相应的resource: this._resources.delete(instance.name)?
    this._resources.clear();
  }

  private async removeResourceInstances(instances: ResourceInstance<unknown>[]) {
    // 1. 获取所有待删除实例涉及的资源类型
    const uniqueResourceTypesToDelete = new Set<ResourceType>(instances.map(e => e.resourceType));

    // 2. 过滤出只包含待删除实例类型的排序结果，并且是反向排序（先删除依赖者，后删除被依赖者）
    // 因为拓扑排序的结果是：被依赖者在前，依赖者在后。
    // 而删除顺序需要：依赖者在前，被依赖者在后。
    // 所以需要反转 sortedGlobalTypes，并过滤出要删除的类型。
    const deletionOrderTypes = this.sortedResourceTypes
      .filter(type => uniqueResourceTypesToDelete.has(type));

    // 3. 按类型顺序逐批删除资源
    for (const typeToDestroy of deletionOrderTypes) {
      const instancesOfType = instances.filter(res => res.resourceType === typeToDestroy);

      console.log(`--- 正在删除 ${typeToDestroy} 类型的资源 ${instancesOfType.length} 个 ---`);
      for (const instance of instancesOfType) {
        console.log(`正在删除实例: ${instance.name} (类型: ${instance.resourceType})`);

        // real delete
        await instance.destroy();
        this._resourceInstances.delete(instance);

        console.log(`实例 ${instance.name} (类型: ${instance.resourceType}) 删除完成。`);
      }
    }
    console.log('所有指定资源删除完成。');
  }

  async apply<TSpec, TState>(expected: ResourceConfig<TSpec>, service: ResourceService<TSpec, TState>): Promise<Resource<TSpec, TState>> {
    let actual = await service.load(expected);
    // todo 已存在的应该删除？
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
    this._resourceInstances.push(...actual);
    return result;
  }

}

export class Project extends BaseProject {
  public _providers = new Map<Provider, ProviderRuntime<Provider>>();

  private constructor(props: {
    name: string;
  }) {
    super({name: props.name});
  }

  registerProvider<T extends Provider>(provider: T): ProviderRuntime<T> {
    const result=new ProviderRuntime(provider);
    this._providers.set(provider, result);
    return result;
  }

  get resourceInstances(): ResourceInstance<unknown>[] {
    return Array.from(this._providers.values()).flatMap(p => p._resourceInstances);
  }

  static of(props: ProjectProps): Project {
    return new Project({name: props.name});
  }

  async apply(apply: Apply): Promise<void> {
    await this.refresh();

    await apply(this);

    // cleanup
    for (const [_, providerRuntime] of this._providers) {
      await providerRuntime.cleanup();
    }
  }

  async refresh(): Promise<void> {
    for (const [_, state] of this._providers) {
      await state.refresh();
    }
  }

  /**
   * 因为非惰性执行的资源，配置以过程性脚本存在，所以无法按某种依赖图去删除资源，只能挨个从固定资源顺序删除
   * - 按Provider注册到Project的后注册先删除的顺序依次删除所有Provider资源
   * - 各Provider按资源类型固定的顺序进行删除，比如先删除虚拟机、再删除网络等等。
   */
  async destroy(): Promise<void> {
    for (const [_, providerRuntime] of this._providers) {
      await providerRuntime.destroy();
    }
  }
}

/**
 * @internal
 */
class __Resources extends Map<string, Resource<unknown, unknown>> {
  constructor(...args: [string, Resource<unknown, unknown>][]) {
    super(args);
    //typescript原型链修复
    Object.setPrototypeOf(this, __Resources.prototype);

  }
}

/**
 * @internal
 */
class __ResourceInstances extends Array<ResourceInstance<unknown>> {
  constructor(...args: ResourceInstance<unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
    //typescript原型链修复
    Object.setPrototypeOf(this, __ResourceInstances.prototype);
  }

  delete(instance: ResourceInstance<unknown>) {
    const index = this.indexOf(instance); // 查找 'banana' 的索引
    if (index !== -1) {
      this.splice(index, 1); // 删除该元素
    }
  }
}

