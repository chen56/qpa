import {VpcEagerFactory, VpcLazyFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {
  ResourceType,
  TencentCloudProvider, TencentCloudResourceService
} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
import {ScopeProps} from "./scope.ts";


/**
 * @public
 */
export abstract class TencentCloud {
  protected constructor(readonly provider: TencentCloudProvider) {
  }


  /**
   * @public
   */
  static createFactory(project:Project,props: { credential: { secretId: string; secretKey: string }; scope: ScopeProps }): TencentCloudFactory {
    const provider = TencentCloudProvider.of(project,{
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
      allowedResourceServices: _allowServices,
      scope: props.scope,
    });
    return new TencentCloudFactory(provider);
  }
}

/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudFactory extends TencentCloud {
  readonly vpc: VpcEagerFactory;

  constructor(readonly provider: TencentCloudProvider) {
    super(provider);
    this.vpc = new VpcEagerFactory(this.provider);
  }
}

/**
 * @public
 */
export class LazyModeTencentCloudFactory extends TencentCloud {
  readonly vpc: VpcLazyFactory;

  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
    super(provider);
    this.vpc = new VpcLazyFactory(this.project, this.provider);
  }
}

/**
 * @private
 */
function _allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown, unknown>> {
  const result: Map<ResourceType, TencentCloudResourceService<unknown, unknown>> = new Map();
  const vpcClients: VpcClients = new VpcClients(provider);
  result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
  return result;
}