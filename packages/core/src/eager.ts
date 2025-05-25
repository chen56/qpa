import {SpecPart, StatusPart} from "src/lazy.ts";

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