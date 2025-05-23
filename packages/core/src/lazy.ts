import {Provider, ResourceService, SpecPart, ISpecPartProps, StatusPart} from "src/service.ts";


export class LazyProject {
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
        // clear old status
        for (const configured of this._configuredResources) {
            configured.statuses.length = 0;
        }
        this._deconfiguredResources.length = 0;

        // load new status
        for (const provider of this._providers) {
            const statuses: StatusPart<unknown>[] = await provider.loadAll();
            for (const status of statuses) {
                const configured = this._configuredResources.find(e => e.name === status.name);
                if (configured) {
                    configured.statuses.push(status.status);
                } else {
                    this._deconfiguredResources.push(status);
                }
            }
        }
    }

    async apply() {
        await this.refresh();
        for (const resource of this._configuredResources) {
            if (resource.statuses.length > 1) {
                throw new Error(`TODO 暂时提示错误，后续要分开为专门的error对象，资源数量超过1个，需要手工处理:${JSON.stringify(resource.statuses, null, 2)}`);
            }
            if (resource.statuses.length == 1) {
                console.log(`资源已存在:${JSON.stringify(resource.statuses)}`);
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


export interface ILazyResourceProps<SPEC, STATUS> extends ISpecPartProps<SPEC> {
    service: ResourceService<SPEC, STATUS>;
}

export class LazyResource<SPEC, STATUS> {
    public readonly name: string;

    _statuses = new Array<STATUS>();
    readonly service: ResourceService<SPEC, STATUS>;
    private readonly specPart: SpecPart<SPEC>;

    public constructor(readonly provider: Provider, props: ILazyResourceProps<SPEC, STATUS>) {
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

    get statuses(): STATUS[] {
        return this._statuses;
    }

    async create(): Promise<StatusPart<STATUS>> {
        return this.service.create(this.specPart);
    }

    async destroy(): Promise<void> {
        return this.service.destroy(this);
    }

    async refresh(): Promise<void> {
        return this.service.refresh(this);
    }
}

/**internal use*/
export enum _ConfigMode {
    Direct,
    Planned
}

export type ConfigSetup = (project: LazyProject) => Promise<void>;

export class Config {
    public project: LazyProject;
    public _setup: ConfigSetup;

    private constructor(public readonly _configMode: _ConfigMode, props: IConfigProps) {
        // 这里可以添加配置验证逻辑
        if (!props.project.name) {
            throw new Error('Missing required project name');
        }

        this.project = new LazyProject(props.project);
        this._setup = props.setup
    }

    public setup(): Promise<void> {
        return this._setup(this.project);
    }

    static directMode(props: IConfigProps) {
        return new Config(_ConfigMode.Direct, props);
    }

    static plannedMode(props: IConfigProps) {
        return new Config(_ConfigMode.Planned, props);
    }
}

export interface IConfigProps {
    // project: Project;
    project: { name: string };
    setup: ConfigSetup;
}


class ConfiguredResources extends Array<LazyResource<unknown, unknown>> {
    constructor(...args: LazyResource<unknown, unknown>[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

class DeconfiguredResources extends Array<StatusPart<unknown>> {
    constructor(...args: StatusPart<unknown>[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

class Providers extends Array<Provider> {
    constructor(...args: Provider[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
    }
}

