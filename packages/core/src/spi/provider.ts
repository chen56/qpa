/**
 * SPI接口
 *
 * Provider的实现类不应该暴露给api客户程序，客户程序应通过@qpa/core的Project使用资源管理功能
 *
 * @return 获取查询出ResourceScope内的所有的资源状态
 */
import {Project, ResourceConfig, ResourceInstance, ResourceType} from "../core.ts";


/**
 * 无状态服务提供者, 状态由每个Provider对应的 ProviderRuntime 维护
 *
 * todo 既然已经拆分ProviderRuntime,为啥不直接用接口呢？
 */
export abstract class Provider {
  protected constructor(readonly project: Project) {
  }

  abstract get resourceServices(): ReadonlyMap<ResourceType, ResourceService<unknown, unknown>>;

  /**
   * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
   *
   * 查询最新的 ResourceScope 内的所有的已存在资源的状态信息
   *
   * @return 获取查询出ResourceScope内的所有的资源状态
   */
  abstract findResourceInstances(): Promise<ResourceInstance<unknown>[]>;
}

export abstract class ResourceService<SPEC, STATE> {
  abstract get resourceType(): ResourceType;

  abstract create(config: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>>;

  abstract delete(...instances: ResourceInstance<STATE>[]): Promise<void>;

  /**
   * @return 可能返回多个实际的同名云资源，因为一个资源可能被非正常的多次创建，重复问题留给上层程序判断解决
   */
  abstract load(config: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>[]> ;
}