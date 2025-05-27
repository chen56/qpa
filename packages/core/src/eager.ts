import {BaseProject} from "./core.ts";

export type EagerApply = (project: Project) => Promise<void>;

export class Project extends BaseProject{
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
        return new Project(props);
    }

    async destroy(): Promise<void> {

    }
}
