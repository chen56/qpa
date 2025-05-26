import {LazyResource, SpecPart, RealizedResource, LazyProject} from "@qpa/core";
import {VpcSpec, VpcService, VpcState} from "./vpc.ts";
import {TencentCloudProvider} from "../provider.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class VpcEagerFactory {
  constructor(readonly provider: TencentCloudProvider) {
  }

  async vpc(props: SpecPart<VpcSpec>) {
    const service = this.provider._getService(VpcService.resourceType) as VpcService;
     // todo get state first
    const state = await service.create(props);
    return new RealizedResource(props, state);
  }
}

/**
 * 工厂方法类
 */
export class VpcLazyFactory {
  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
  }
  vpc(props: SpecPart<VpcSpec>): LazyResource<VpcSpec, VpcState> {
    const result = new LazyResource<VpcSpec, VpcState>(this.provider, {
      ...props,
      service: this.provider._getService(VpcService.resourceType) as VpcService,
    });
    this.project._configuredResources.push(result);
    return result;
  }
}