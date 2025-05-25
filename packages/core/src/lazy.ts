import {Project, Provider, ResourceService, SpecPart, StatePart} from "./core.ts";

export class LazyProject extends Project {
  _providers: Providers = new Providers();

  _configuredResources: ConfiguredResources = new ConfiguredResources();
  _deconfiguredResources: DeconfiguredResources = new DeconfiguredResources();

  /**
   * key: 这个key非常重要，是云资源工作空间的唯一标识，用于区分不同的云资源工作空间
   * 所有资源都在此key下，资源的创建和删除依赖它
   */
  constructor() {
    super();
  }

  async refresh(): Promise<void> {
    // clear old state
    for (const configured of this._configuredResources) {
      configured.STATE.length = 0;
    }
    this._deconfiguredResources.length = 0;

    // load new state
    for (const provider of this._providers) {
      const STATE: StatePart<unknown>[] = await provider.listProvisionedResources();
      for (const state of STATE) {
        const configured = this._configuredResources.find(e => e.name === state.name);
        if (configured) {
          configured.STATE.push(state);
        } else {
          this._deconfiguredResources.push(state);
        }
      }
    }
  }

  async apply() {
    await this.refresh();
    for (const resource of this._configuredResources) {
      if (resource.STATE.length > 1) {
        throw new Error(`TODO 暂时提示错误，后续要分开为专门的error对象，资源数量超过1个，需要手工处理:${JSON.stringify(resource.STATE, null, 2)}`);
      }
      if (resource.STATE.length == 1) {
        console.log(`资源已存在:${JSON.stringify(resource.STATE)}`);
        return;
      }
      await resource.create();
    }
    for (const resource of this._deconfiguredResources) {
      resource.destroy();
    }
  }

  async destroy() {
    await this.refresh();
    for (const resource of this._configuredResources) {
      await resource.destroy();
    }
  }
}


export class LazyResource<SPEC, STATE> {
  public readonly name: string;

  _STATE:StatePart<STATE>[] = [];
  readonly service: ResourceService<SPEC, STATE>;
  private readonly specPart: SpecPart<SPEC>;

  public constructor(readonly provider: Provider, props: {
    /** in a resource type, name is unique ,like k8s name/terraform name field*/
    name: string;
    spec: SPEC;
    service: ResourceService<SPEC, STATE>;
  }) {
    this.name = props.name;
    this.specPart = new SpecPart(props);
    this.service = props.service;
  }

  public get spec(): SPEC {
    return this.specPart.spec;
  }

  get STATE(): StatePart<STATE>[] {
    return this._STATE;
  }

  async create(): Promise<StatePart<STATE>> {
    return this.service.create(this.specPart);
  }

  async destroy(): Promise<void> {
    return this.service.destroy(...this._STATE);
  }

  async reload(): Promise<void> {
    this._STATE=await this.service.refresh(this);
  }
}

/**internal use*/
export enum _ConfigMode {
  Direct,
  Planned
}

export type ConfigSetup = (project: LazyProject) => Promise<void>;

export class ConfigTodoRemove {
  public project: LazyProject;
  public _setup: ConfigSetup;

  private constructor(public readonly _configMode: _ConfigMode, props: IConfigProps) {
    this.project = new LazyProject();
    this._setup = props.setup
  }

  public setup(): Promise<void> {
    return this._setup(this.project);
  }

  static directMode(props: IConfigProps) {
    return new ConfigTodoRemove(_ConfigMode.Direct, props);
  }

  static plannedMode(props: IConfigProps) {
    return new ConfigTodoRemove(_ConfigMode.Planned, props);
  }
}

export interface IConfigProps {
  setup: ConfigSetup;
}


class ConfiguredResources extends Array<LazyResource<unknown, unknown>> {
  constructor(...args: LazyResource<unknown, unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }

  push(...items: LazyResource<unknown, unknown>[]): number {
    let result = this.length;
    for (const item of items) {
      const sameName = this.find(r => r.name === item.name);
      if (sameName) {
        throw new Error(`资源名称重复:${item.name}`);
      }
      result = super.push(item);
    }
    return result;
  }
}

class DeconfiguredResources extends Array<StatePart<unknown>> {
  constructor(...args: StatePart<unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}

export class Providers extends Array<Provider> {
  constructor(...args: Provider[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}