import {BaseProject, Provider, ResourceService, ResourceConfig, ResourceInstance} from "./core.ts";

export class LazyProject extends BaseProject {
  _providers: Providers = new Providers();

  _configuredResources: ConfiguredResources = new ConfiguredResources();
  _deconfiguredResources: DeconfiguredResources = new DeconfiguredResources();

  /**
   * key: 这个key非常重要，是云资源工作空间的唯一标识，用于区分不同的云资源工作空间
   * 所有资源都在此key下，资源的创建和删除依赖它
   */
  constructor(props:{name:string}) {
    super({name: props.name});
  }

  async refresh(): Promise<void> {
    // clear old state
    for (const configured of this._configuredResources) {
      configured.states.length = 0;
    }
    this._deconfiguredResources.length = 0;

    // load new state
    for (const provider of this._providers) {
      const actualStates: ResourceInstance<unknown>[] = await provider.findResourceInstances();
      for (const state of actualStates) {
        const configured = this._configuredResources.find(e => e.name === state.name);
        if (configured) {
          configured.states.push(state);
        } else {
          this._deconfiguredResources.push(state);
        }
      }
    }
  }

  async apply() {
    await this.refresh();
    for (const resource of this._configuredResources) {
      if (resource.states.length > 1) {
        throw new Error(`TODO 暂时提示错误，后续要分开为专门的error对象，资源数量超过1个，需要手工处理:${JSON.stringify(resource.states, null, 2)}`);
      }
      if (resource.states.length == 1) {
        console.log(`资源已存在:${JSON.stringify(resource.states)}`);
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

  _states:ResourceInstance<STATE>[] = [];
  readonly service: ResourceService<SPEC, STATE>;
  private readonly specPart: ResourceConfig<SPEC>;

  public constructor(readonly provider: Provider, props: {
    /** in a resource type, name is unique ,like k8s name/terraform name field*/
    name: string;
    spec: SPEC;
    service: ResourceService<SPEC, STATE>;
  }) {
    this.name = props.name;
    this.specPart = props;
    this.service = props.service;
  }

  public get spec(): SPEC {
    return this.specPart.spec;
  }

  get states(): ResourceInstance<STATE>[] {
    return this._states;
  }

  async create(): Promise<ResourceInstance<STATE>> {
    return this.service.create(this.specPart);
  }

  async destroy(): Promise<void> {
    return this.service.delete(...this._states);
  }

  async reload(): Promise<void> {
    this._states=await this.service.load(this);
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

  private constructor(public readonly _configMode: _ConfigMode, props: ConfigProps) {
    this.project = new LazyProject({name:props.name});
    this._setup = props.setup
  }

  public setup(): Promise<void> {
    return this._setup(this.project);
  }

  static directMode(props: ConfigProps) {
    return new ConfigTodoRemove(_ConfigMode.Direct, props);
  }

  static plannedMode(props: ConfigProps) {
    return new ConfigTodoRemove(_ConfigMode.Planned, props);
  }
}

export interface ConfigProps {
  name:string
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

class DeconfiguredResources extends Array<ResourceInstance<unknown>> {
  constructor(...args: ResourceInstance<unknown>[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}

export class Providers extends Array<Provider> {
  constructor(...args: Provider[]) {
    super(...args); // 调用 Array(...items: T[]) 构造形式
  }
}