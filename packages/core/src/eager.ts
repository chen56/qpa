import {BaseProject, Provider, ResourceInstance} from "./core.ts";

export type EagerApply = (project: Project) => Promise<void>;

interface ProjectProps {
  name: string;
}

export class Project extends BaseProject {
  public providers = new Set<Provider>();
  public name: string;
  get resourceInstances() :ResourceInstance<unknown>[]{
    return Array.from(this.providers).flatMap(p => p.resourceInstances);
  }

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
    for (const provider of this.providers) {
      await provider.refresh();
    }
  }

  private async __cleanup(): Promise<void> {

  }

  /**
   * 因为非惰性执行的资源，配置以过程性脚本存在，所以无法按某种依赖图去删除资源，只能挨个从固定资源顺序删除
   * - 按Provider注册到Project的后注册先删除的顺序依次删除所有Provider资源
   * - 各Provider按资源类型固定的顺序进行删除，比如先删除虚拟机、再删除网络等等。
   */
  async destroy(): Promise<void> {
    const safeCopy = Array.from(this.providers); // 再次从 Set 转换为数组
    safeCopy.reverse(); // 反转数组 (注意：reverse() 会修改原数组，所以需要先复制)

    for (const provider of safeCopy) {
      await provider.destroy();
    }
  }
}