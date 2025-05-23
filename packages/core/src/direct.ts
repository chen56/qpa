
export class PaPaResource<SPEC, STATE> {
    public readonly name: string;

    _states = new Array<STATE>();
    readonly service: ResourceService<SPEC, STATE>;
    private readonly specPart: SpecPart<SPEC>;

    public constructor(readonly provider: Provider, props: ResourceProps<SPEC, STATE>) {
        const sameName = provider.project._configuredResources.find(r => r.name === props.name);
        if (sameName) {
            throw new Error(`资源名称重复:${props.name}`);
        }

        this.name = props.name;
        this.specPart = new SpecPart(props);
        this.service = props.service;

        this.provider.project._configuredResources.push(this);
    }

    public get spec(): SPEC {
        return this.specPart.spec;
    }

    get states(): STATE[] {
        return this._states;
    }

    async create(): Promise<StatePart<STATE>> {
        return this.service.create(this.specPart);
    }

    async destroy(): Promise<void> {
        return this.service.destroy(this);
    }

    async refresh(): Promise<void> {
        return this.service.refresh(this);
    }
}

export const Constants = {
    tagNames: {
        resource: "qpa_name",
        project: "qpa_project_name",
    },
} as const;

/**internal use*/
export enum _ConfigMode {
    Direct,
    Planned
}

export type ConfigSetup = (project: Project) => Promise<void>;

export class Config {
    public project: Project;
    public _setup: ConfigSetup;

    private constructor(public readonly _configMode: _ConfigMode, props: ConfigProps) {
        // 这里可以添加配置验证逻辑
        if (!props.project.name) {
            throw new Error('Missing required project name');
        }
        this.project = props.project;
        this._setup = props.setup
    }

    public setup(): Promise<void> {
        return this._setup(this.project);
    }

    static directMode(props: ConfigProps) {
        return new Config(_ConfigMode.Direct, props);
    }

    static plannedMode(props: ConfigProps) {
        return new Config(_ConfigMode.Planned, props);
    }
}

export interface ConfigProps  {
    project: Project;
    setup: ConfigSetup;
}

/**
 * 加载中的资源，是资源加载的临时数据，
 */
export class StatePart<STATE> {
    constructor(readonly name: string, readonly state: STATE) {
    }

    destroy() {

    }
}

export class SpecPart<SPEC> {
    readonly name: string;
    readonly spec: SPEC

    constructor(props: SpecPartProps<SPEC>) {
        this.name = props.name;
        this.spec = props.spec;
    }
}

export class AppliedResource<SPEC, STATE> {
    public readonly name: string;

    constructor(private readonly specPart: SpecPart<SPEC>, private readonly statePart: StatePart<STATE>) {
        this.name = statePart.name;
    }

    get spec() {
        return this.specPart.spec;
    }

    get state() {
        return this.statePart.state;
    }

    destroy() {
        this.statePart.destroy();
    }
}


export abstract class ResourceService<SPEC, STATE> {
    abstract create(resource: SpecPart<SPEC>): Promise<StatePart<STATE>>;

    abstract destroy(resource: PaPaResource<SPEC, STATE>): Promise<void>;

    abstract refresh(resource: PaPaResource<SPEC, STATE>): Promise<void> ;
}

export interface SpecPartProps<SPEC> {
    /** in a resource type, name is unique ,like k8s name/terraform name field*/
    name: string;
    spec: SPEC;
}

export interface ResourceProps<SPEC, STATE> extends SpecPartProps<SPEC> {
    service: ResourceService<SPEC, STATE>;
}

export abstract class Provider {
    protected constructor(readonly project: Project) {
        project._providers.push(this);
    }

    abstract loadAll(): Promise<StatePart<unknown>[]>;
}

export class Project {
    _providers: Providers = new Providers();
    _configuredResources: ConfiguredResources = new ConfiguredResources();
    _deconfiguredResources: DeconfiguredResources = new DeconfiguredResources();
    name: string;

    /**
     * key: 这个key非常重要，是云资源工作空间的唯一标识，用于区分不同的云资源工作空间
     * 所有资源都在此key下，资源的创建和删除依赖它
     */
    constructor(props: { name: string }) {
        // 这里可以添加配置验证逻辑
        if (!props.name) {
            throw new Error('Missing required project name');
        }

        this.name = props.name;
    }

    async refresh(): Promise<void> {
        // clear old state
        for (const configured of this._configuredResources) {
            configured.states.length = 0;
        }
        this._deconfiguredResources.length = 0;

        // load new state
        for (const provider of this._providers) {
            const states: StatePart<unknown>[] = await provider.loadAll();
            for (const state of states) {
                const configured = this._configuredResources.find(e => e.name === state.name);
                if (configured) {
                    configured.states.push(state.state);
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

class ConfiguredResources extends Array<PaPaResource<unknown, unknown>> {
    constructor(...args: PaPaResource<unknown, unknown>[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

class DeconfiguredResources extends Array<StatePart<unknown>> {
    constructor(...args: StatePart<unknown>[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

class Providers extends Array<Provider> {
    constructor(...args: Provider[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

