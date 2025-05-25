import {VpcEagerFactory, VpcLazyFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {ResourceType, TencentCloudProvider, TencentCloudResourceService} from "./provider.ts";
import {Project, ResourceScope} from "@qpa/core";

class TencentCloudTagBaseResourceGroup implements ResourceScope{
  name: string;
  constructor(props:{name:string;}) {
    this.name= props.name;
  }
}

export abstract class TencentCloud {
  protected constructor(readonly provider: TencentCloudProvider) {
  }

  static createTagBaseScope(props:{name:string;}){
    return new TencentCloudTagBaseResourceGroup(props);
  }

  static eagerMode(props: {
    credential: { secretId: string; secretKey: string };
    project: Project;
    scope: ResourceScope;
  }) {
    const tencentCloudProvider = new TencentCloudProvider(props.project, {
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
      allowedResourceServices: _allowServices
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
 * 工厂方法类
 */
export class LazyModeTencentCloudFactory extends TencentCloud {
  readonly vpc: VpcLazyFactory;

  constructor(readonly provider: TencentCloudProvider) {
    super(provider);
    this.vpc = new VpcLazyFactory(this.provider);
  }
}

function _allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown, unknown>> {
  const result: Map<ResourceType, TencentCloudResourceService<unknown, unknown>> = new Map();
  const vpcClients: VpcClients = new VpcClients(provider);
  result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
  return result;
}