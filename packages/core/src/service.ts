import {PlannedProject, PlanningResource} from "src/lazy.ts";

export const Service = {
    tagNames: {
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
    abstract create(resource: SpecPart<SPEC>): Promise<StatusPart<STATUS>>;

    abstract destroy(resource: PlanningResource<SPEC, STATUS>): Promise<void>;

    abstract refresh(resource: PlanningResource<SPEC, STATUS>): Promise<void> ;
}

export abstract class Provider {
    protected constructor(readonly project: PlannedProject) {
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