import {Project} from "./service.ts";

export type EagerApply = (project: EagerProject) => Promise<void>;

export class EagerProject extends Project{
    public _apply: EagerApply;

    private constructor(props: {
        name: string;
        setup: EagerApply;
    }) {
        super({name: props.name});

        this._apply = props.setup
    }

    apply(): Promise<void> {
        return this._apply(this);
    }

    static of(props: {
        name: string;
        setup: EagerApply;
    }) {
        return new EagerProject(props);
    }

    async destroy(): Promise<void> {

    }
}
