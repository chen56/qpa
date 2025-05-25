import {PlannedProject, PlannedResource, SpecPart, StatePart} from "src/plan.ts";

export const Service = {
    tagNames: {
        resource: "qpa_name",
        project: "qpa_project_name",
    },
} as const;

export abstract class ResourceService<SPEC, STATE> {
    abstract create(resource: SpecPart<SPEC>): Promise<StatePart<STATE>>;

    abstract destroy(resource: PlannedResource<SPEC, STATE>): Promise<void>;

    abstract refresh(resource: PlannedResource<SPEC, STATE>): Promise<void> ;
}

export abstract class Provider {
    protected constructor(readonly project: PlannedProject) {
        project._providers.push(this);
    }

    abstract loadAll(): Promise<StatePart<unknown>[]>;
}

