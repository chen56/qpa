import {LazyResource, ResourceConfig, Resource, LazyProject} from "@qpa/core";
import {VpcSpec, VpcService, VpcState} from "./vpc.ts";
import {TencentCloudProvider} from "../provider.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class VpcEagerFactory {
  constructor(readonly provider: TencentCloudProvider) {
  }

  async vpc(config: ResourceConfig<VpcSpec>) {
    const service = this.provider._getService(VpcService.resourceType) as VpcService;
     // todo get state first
    let actual = await service.load(config);
    if(actual.length==0){
      await service.create(config);
      actual = await service.load(config);
      // 按理说不应该出现此状况，可能是云的资源服务bug
      if(actual.length==0){
        throw new Error("创建VPC失败,未知原因,可能是云资源服务bug, 请重试");
      }
    }
    return new Resource(config, actual);
  }
}

/**
 * 工厂方法类
 */
export class VpcLazyFactory {
  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
  }
  vpc(props: ResourceConfig<VpcSpec>): LazyResource<VpcSpec, VpcState> {
    const result = new LazyResource<VpcSpec, VpcState>(this.provider, {
      ...props,
      service: this.provider._getService(VpcService.resourceType) as VpcService,
    });
    this.project._configuredResources.push(result);
    return result;
  }
}