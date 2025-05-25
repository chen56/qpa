import {LazyResource} from "./lazy.ts";


export abstract class Project {
  name: string;
  _providers: Providers = new Providers();

  protected constructor(props: { name: string; }) {
    // 这里可以添加配置验证逻辑
    if (!props.name) {
      throw new Error('Missing required project name');
    }

    this.name = props.name;
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

  constructor(props: {
    /** in a resource type, name is unique ,like k8s name/terraform name field*/
    name: string;
    spec: SPEC;
  }) {
    this.name = props.name;
    this.spec = props.spec;
  }
}

export abstract class ResourceService<SPEC, STATUS> {
  abstract create(resource: SpecPart<SPEC>): Promise<StatusPart<STATUS>>;

  abstract destroy(resource: LazyResource<SPEC, STATUS>): Promise<void>;

  abstract refresh(resource: LazyResource<SPEC, STATUS>): Promise<void> ;
}

export abstract class Provider {
  protected constructor(readonly project: Project) {
    project._providers.push(this);
  }

  abstract loadAll(): Promise<StatusPart<unknown>[]>;
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

export class Providers extends Array<Provider> {
  constructor(...args: Provider[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}