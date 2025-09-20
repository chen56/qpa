import {ProviderConfig, ProviderRuntime, ResourceService} from "./providerConfig.ts";

abstract class BaseProject {
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

export interface Resource<SPEC, STATE> extends ResourceConfig<SPEC> {
  get actualInstance(): ResourceInstance<STATE>;

  get state(): STATE;
}

/**
 * 一个完整的受管理资源，包括
 * - expected: 资源配置(定义期望的规格状态)
 * - actual: 对应的以资源名为映射关系的的多个同名实际资源实例(正常应该只有一个,但可能有重复create的问题资源)
 *
 * 资源的最终状态，LazyResource加载后也会变成完全体的Resource
 */
export class Resource_<SPEC, STATE> implements Resource<SPEC, STATE> {

  // todo actual要改为单数，集合放到核心api有点难以理解和应用，这个类就应该是完整的
  constructor(private readonly expected: ResourceConfig<SPEC>, readonly actual: ResourceInstance<STATE>[]) {
    if (actual.length == 0) {
      throw new Error("Resource为非惰性资源，创建Resource必须提供对应云上实例");
    }
    for (const instance of actual) {
      if (expected.name !== instance.name) {
        throw new Error(`expected.name(${expected.name})必须和实际资源实例的name(${instance.name})一致`);
      }
    }
  }


  get spec(): SPEC {
    return this.expected.spec;
  }

  /**
   * name 是区分资源的关键, 我们会把name 用tag的形式打在每个实际的资源上, 以此对齐声明的资源配置和实际资源实例
   */
  get name(): string {
    return this.expected.name;
  }

  get actualInstance(): ResourceInstance<STATE> {
    if (this.actual.length != 1) {
      throw new Error(`正常资源应该对应云上1个云上实际实例，但现在有${this.actual.length}个,请检查:${this.actual.map(it => (it.toJson()))}`);
    }
    return this.actual[0];
  }

  get state(): STATE {
    return this.actualInstance.state;
  }
}

export interface ProjectProps {
  name: string;
}

export type Apply = (project: Project) => Promise<void>;

export class Project extends BaseProject {
  public _providers = new Map<ProviderConfig, ProviderRuntime<ProviderConfig>>();

  private constructor(props: {
    name: string;
  }) {
    super({name: props.name});
  }

  registerProvider<T extends ProviderConfig>(provider: T): ProviderRuntime<T> {
    const result = ProviderRuntime._create(this, provider);
    this._providers.set(provider, result);
    return result;
  }

  get resourceInstances(): ResourceInstance<unknown>[] {
    return Array.from(this._providers.values()).flatMap(p => p._resourceInstances);
  }
  get resources(): Resource<unknown, unknown>[] {
    return Array.from(this._providers.values())
      .flatMap(p => Array.from(p._resources.values()));
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
