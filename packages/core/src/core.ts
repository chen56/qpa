

export abstract class Project {

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
 * 实际资源的状态部分信息，包含
 * - state字段: 实际资源原始信息，云厂商定义的资源信息,数据结构以云api资源数据结构为基础,可能会增加一些字段,比如region
 * - 其他字段：云上资源从tag等提取出的QPA元信息，比如resource_name,resource_scope等
 */
export class StatePart<STATE> {
  constructor(readonly name: string, readonly state: STATE) {
  }

  destroy() {

  }
}

export interface SpecPartProps<SPEC> {
  /** in a resource type, name is unique ,like k8s name/terraform name field*/
  name: string;
  spec: SPEC;
}

/**
 * Declared Resources‘s Specification Part
 *
 * 指资源的配置部分，即渴望的状态 (Desired State)
 */
export class SpecPart<SPEC> {
  readonly name: string;
  readonly spec: SPEC

  constructor(props: SpecPartProps<SPEC>) {
    this.name = props.name;
    this.spec = props.spec;
  }
}

export abstract class ResourceService<SPEC, STATE> {
  abstract create(specPart: SpecPart<SPEC>): Promise<StatePart<STATE>>;

  abstract delete(...stateParts: StatePart<STATE>[]): Promise<void>;

  /**
   * @return 可能返回多个实际的同名云资源，因为一个资源可能被非正常的多次创建，重复问题留给上层程序判断解决
   */
  abstract load(specPart: SpecPart<SPEC>): Promise<StatePart<STATE>[]> ;
}

export abstract class Provider {
  /**
   * 查询最新的 ResourceScope 内的所有的已存在资源的状态信息
   *
   * @return 获取查询出ResourceScope内的所有的资源状态
   */
  abstract findActualResourceStates(): Promise<StatePart<unknown>[]>;
}

export class RealizedResource<SPEC, STATE> {
  public readonly name: string;
  public readonly spec: SPEC;

  constructor(specPart: SpecPart<SPEC>, private readonly statePart: StatePart<STATE>) {
    this.name = statePart.name;
    this.spec=specPart.spec;
  }

  get state() {
    return this.statePart.state;
  }

  destroy() {
    throw new Error("Method not implemented.");
  }
}

