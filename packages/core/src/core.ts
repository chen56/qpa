export abstract class BaseProject {

  protected constructor() {
  }
}


export const Constants = {
  tagNames: {
    // todo rename to qpa_resource_name
    resource: "qpa_name",
    project: "qpa_project_name",
  },
} as const;

/**
 * 实际资源，包含
 * - state字段: 特定于云厂商的实际资源状态信息，数据结构以云api资源数据结构为基础,可能会增加一些字段,比如region
 * - 其他字段：云上资源从tag等提取出的QPA元信息，比如resource_name等
 */
export class ResourceInstance<STATE> {
  private resourceService: ResourceService<unknown, STATE>;

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
   * 查询最新的 ResourceScope 内的所有的已存在资源的状态信息
   *
   * @return 获取查询出ResourceScope内的所有的资源状态
   */
  abstract findResourceInstances(): Promise<ResourceInstance<unknown>[]>;

  abstract refresh(): Promise<void>;

  abstract destroy(): Promise<void>;
}

/**
 * 一个完整的受管理资源，包括
 * - expected: 资源配置(定义期望的规格状态)
 * - actual: 对应的以资源名为映射关系的的多个同名实际资源实例(正常应该只有一个,但可能有重复create的问题资源)
 *
 * 资源的最终状态，LazyResource加载后也会变成完全体的Resource
 */
export class Resource<SPEC, STATE> {

  constructor(readonly expected: ResourceConfig<SPEC>, readonly actual: ResourceInstance<STATE>[]) {
    if(actual.length==0){
      throw new Error("Resource为非惰性资源，创建Resource必须提供对应云上实例");
    }
  }

  get actualInstance() {
    if (this.actual.length != 1) {
      throw new Error(`正常资源应该对应云上1个云上实际实例，但现在有[${this.actual.length}]个,请检查:${this.actual.map(it => (it.toJson()))}`);
    }
    return this.actual[0];
  }

  destroy() {
    throw new Error("Method not implemented.");
  }
}