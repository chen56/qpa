
export abstract class BaseResourceScope {
}


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
 * 加载中的资源，是资源加载的临时数据，
 */
export class StatusPart<STATUS> {
  constructor(readonly name: string, readonly status: STATUS) {
  }

  destroy() {

  }
}

export interface ISpecPartProps<SPEC> {
  /** in a resource type, name is unique ,like k8s name/terraform name field*/
  name: string;
  spec: SPEC;
}

export class SpecPart<SPEC> {
  readonly name: string;
  readonly spec: SPEC

  constructor(props: ISpecPartProps<SPEC>) {
    this.name = props.name;
    this.spec = props.spec;
  }
}

export abstract class ResourceService<SPEC, STATUS> {
  abstract create(specPart: SpecPart<SPEC>): Promise<StatusPart<STATUS>>;

  abstract destroy(...statusParts: StatusPart<STATUS>[]): Promise<void>;

  /**
   * @return 可能返回多个实际的同名云资源，因为一个资源可能被非正常的多次创建，重复问题留给上层程序判断解决
   */
  abstract refresh(specPart: SpecPart<SPEC>): Promise<StatusPart<STATUS>[]> ;
}

export abstract class Provider {
  /**
   * 查询出ResourceScope内的所有的已存在资源
   *
   * @return 获取查询出ResourceScope内的所有的资源状态
   */
  abstract listProvisionedResources(): Promise<StatusPart<unknown>[]>;
}

export class RealizedResource<SPEC, STATUS> {
  public readonly name: string;

  constructor(private readonly specPart: SpecPart<SPEC>, private readonly statusPart: StatusPart<STATUS>) {
    this.name = statusPart.name;
  }

  get spec() {
    return this.specPart.spec;
  }

  get status() {
    return this.statusPart.status;
  }

  destroy() {
    this.statusPart.destroy();
  }
}

