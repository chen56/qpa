

export abstract class BaseProject {

  protected constructor() {
  }
}

/**
 * 实际资源，包含
 * - state字段: 特定于云厂商的实际资源状态信息，数据结构以云api资源数据结构为基础,可能会增加一些字段,比如region
 * - 其他字段：云上资源从tag等提取出的QPA元信息，比如resource_name等
 */
export class ResourceInstance<STATE> {
  private resourceService: ResourceService<unknown, STATE>;

  /**
   * @internal
   */
  constructor(resourceService: ResourceService<unknown, STATE>, readonly name: string, readonly state: STATE) {
    this.resourceService = resourceService;
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

export abstract class ResourceService<SPEC, STATE> {
  abstract create(specPart: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>>;

  abstract delete(...resources: ResourceInstance<STATE>[]): Promise<void>;

  /**
   * @return 可能返回多个实际的同名云资源，因为一个资源可能被非正常的多次创建，重复问题留给上层程序判断解决
   */
  abstract load(config: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>[]> ;
}

export abstract class Provider {
  abstract get resourceInstances(): ResourceInstance<unknown>[];

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 查询最新的 ResourceScope 内的所有的已存在资源的状态信息
   *
   * @return 获取查询出ResourceScope内的所有的资源状态
   */
  abstract findResourceInstances(): Promise<ResourceInstance<unknown>[]>;

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   ** */
  abstract refresh(): Promise<void>;

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 销毁所有实际存在的资源实例
   * */
  abstract destroy(): Promise<void>;

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 因为清理方法是apply的最后一步，此方法必须在外部调用完apply后才能使用。
   *
   * 清理待删除资源(Pending Deletion Instances)
   * 服务提供者Provider应确保此方法内部先获取最新的实际资源实例，再删除所有Pending Deletion Instances
   * 不应期待外部调用者获取最新状态
   * */
  abstract cleanup(): Promise<void>;
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
    if(actual.length==0){
      throw new Error("Resource为非惰性资源，创建Resource必须提供对应云上实例");
    }
    for (const instance of actual) {
      if(expected.name!==instance.name){
        throw new Error(`expected.name(${expected.name})必须和实际资源实例的name(${instance.name})一致`);
      }
    }
  }

  /**
   * name 是区分资源的关键, 我们会把name 用tag的形式打在每个实际的资源上, 以此对齐声明的资源配置和实际资源实例
   */
  get name():string{
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

export class Project extends BaseProject {
  public providers = new Set<Provider>();
  public name: string;

  get resourceInstances(): ResourceInstance<unknown>[] {
    return Array.from(this.providers).flatMap(p => p.resourceInstances);
  }

  public constructor(props: {
    name: string;
  }) {
    super();
    this.name = props.name
  }

  static of(props: ProjectProps): Project {
    return new Project({name: props.name});
  }

  async apply(apply: Apply): Promise<void> {
    await this.refresh();

    await apply(this);

    // cleanup
    for (const provider of this.providers) {
      await provider.cleanup();
    }
  }

  async refresh(): Promise<void> {
    for (const provider of this.providers) {
      await provider.refresh();
    }
  }

  /**
   * 因为非惰性执行的资源，配置以过程性脚本存在，所以无法按某种依赖图去删除资源，只能挨个从固定资源顺序删除
   * - 按Provider注册到Project的后注册先删除的顺序依次删除所有Provider资源
   * - 各Provider按资源类型固定的顺序进行删除，比如先删除虚拟机、再删除网络等等。
   */
  async destroy(): Promise<void> {
    const safeCopy = Array.from(this.providers); // 再次从 Set 转换为数组
    safeCopy.reverse(); // 反转数组 (注意：reverse() 会修改原数组，所以需要先复制)

    for (const provider of safeCopy) {
      await provider.destroy();
    }
  }
}