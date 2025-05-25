import {LazyResource, ISpecPartProps, RealizedResource, SpecPart, LazyProject} from "@qpa/core";
import {Vpc, VpcService, VpcState} from "./vpc.ts";
import {TencentCloudProvider} from "../provider.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class VpcEagerFactory {
  constructor(readonly provider: TencentCloudProvider) {
  }

  async vpc(props: ISpecPartProps<Vpc>) {
    const service = this.provider._getService(VpcService.resourceType) as VpcService;
    let spec = new SpecPart<Vpc>(props);

    // todo get status first
    const STATUS = await service.create(spec);

    return new RealizedResource(spec, STATUS);
  }
}

/**
 * 工厂方法类
 */
export class VpcLazyFactory {
  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
  }
  vpc(props: ISpecPartProps<Vpc>): LazyResource<Vpc, VpcState> {
    const result = new LazyResource<Vpc, VpcState>(this.provider, {
      ...props,
      service: this.provider._getService(VpcService.resourceType) as VpcService,
    });
    this.project._configuredResources.push(result);
    return result;
  }
}