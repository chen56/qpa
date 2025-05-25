import {Project} from "./core.ts";

export type EagerApply = (project: EagerProject) => Promise<void>;

export class EagerProject extends Project{
    public _apply: EagerApply;

    private constructor(props: {
        setup: EagerApply;
    }) {
        super();

        this._apply = props.setup
    }

    apply(): Promise<void> {
        return this._apply(this);
    }

    static of(props: {
        setup: EagerApply;
    }) {
        return new EagerProject(props);
    }

    async destroy(): Promise<void> {

    }
}
