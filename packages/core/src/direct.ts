import {SpecPart, StatePart} from "src/plan.ts";

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