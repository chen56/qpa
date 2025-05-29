import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./internal/_common.ts";
import {
  TencentCloudType, TencentCloudCredential,
  TencentCloudProvider, TencentCloudResourceService
} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
import {VpcLazyFactory} from "./vpc/factory.ts";
import {SubnetService} from "./vpc/subnet.ts";

/**
 * @public
 */
export abstract class TencentCloud {
  protected constructor(readonly provider: TencentCloudProvider) {
  }

  /**
   * @public
   */
  static createFactory(project: Project, props: {
    credential: TencentCloudCredential;
  }): TencentCloudFactory {
    const provider = TencentCloudProvider.of(project, {
      ...props,
      serviceRegister: _serviceRegister,
    });
    return new TencentCloudFactory(provider);
  }
}

/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudFactory extends TencentCloud {
  readonly vpc: VpcFactory;

  constructor(readonly provider: TencentCloudProvider) {
    super(provider);
    this.vpc = new VpcFactory(this.provider);
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
function _serviceRegister(provider: TencentCloudProvider): Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> {
  const result: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> = new Map();
  const vpcClients: VpcClients = new VpcClients(provider);
  result.set(TencentCloudType.vpc_vpc, new VpcService(provider, vpcClients));
  result.set(TencentCloudType.vpc_subnet, new SubnetService(provider, vpcClients));
  return result;
}