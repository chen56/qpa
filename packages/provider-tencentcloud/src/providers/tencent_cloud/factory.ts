import {VpcEagerFactory, VpcLazyFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {ResourceType, TencentCloudProvider, TencentCloudResourceService} from "./provider.ts";
import {Project, IResourceScope} from "@qpa/core";


/**
 * @internal
 */
class TencentCloudResourceScope implements IResourceScope {
  name: string;

  constructor(props: { name: string; }) {
    this.name = props.name;
  }
}

/**
 * @internal
 */
class TencentCloudTagBaseResourceScope extends TencentCloudResourceScope {
  constructor(props: { name: string; }) {
    super({name: props.name})
  }
}

/**
 * @public
 */
export abstract class TencentCloud {
  protected constructor(readonly provider: TencentCloudProvider) {
  }

  /**
   * @public
   */
  static createTagBaseScope(props: { name: string; }) {
    return new TencentCloudTagBaseResourceScope(props);
  }

  /**
   * @public
   */
  static eagerMode(props: {
    credential: { secretId: string; secretKey: string };
    project: Project;
    scope: TencentCloudResourceScope;
  }): EagerModeTencentCloudFactory {
    const tencentCloudProvider = new TencentCloudProvider(props.project, {
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
      allowedResourceServices: _allowServices,
      scope: props.scope,
    });
    return new EagerModeTencentCloudFactory(tencentCloudProvider);
  }
}

/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class EagerModeTencentCloudFactory extends TencentCloud {
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

  constructor(readonly provider: TencentCloudProvider) {
    super(provider);
    this.vpc = new VpcLazyFactory(this.provider);
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