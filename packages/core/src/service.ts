import {PlannedProject, PlannedResource, SpecPart, StatusPart} from "src/lazy.ts";

export const Service = {
    tagNames: {
        resource: "qpa_name",
        project: "qpa_project_name",
    },
} as const;

export abstract class ResourceService<SPEC, STATUS> {
    abstract create(resource: SpecPart<SPEC>): Promise<StatusPart<STATUS>>;

    abstract destroy(resource: PlannedResource<SPEC, STATUS>): Promise<void>;

    abstract refresh(resource: PlannedResource<SPEC, STATUS>): Promise<void> ;
}

export abstract class Provider {
    protected constructor(readonly project: PlannedProject) {
        project._providers.push(this);
    }

    abstract loadAll(): Promise<StatusPart<unknown>[]>;
}

