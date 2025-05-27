import {BaseProject, Provider} from "./core.ts";

export type EagerApply = (project: Project) => Promise<void>;

interface ProjectProps {
  name: string;
}

export class Project extends BaseProject {
  public providers = new Set<Provider>();
  public name: string;

  public constructor(props: {
    name: string;
  }) {
    super();
    this.name = props.name
  }

  static of(props: ProjectProps): Project {
    return new Project({name: props.name});
  }

  async apply(apply: EagerApply): Promise<void> {
    await this.refresh();
    await apply(this);
    await this.__cleanup();
  }

  async refresh(): Promise<void> {

  }

  private async __cleanup(): Promise<void> {

  }

  async destroy(): Promise<void> {

  }
}