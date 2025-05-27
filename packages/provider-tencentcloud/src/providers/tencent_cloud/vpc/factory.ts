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
    let actual = await service.load(config);
    if(actual.length==0){
      actual = [await service.create(config)];
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