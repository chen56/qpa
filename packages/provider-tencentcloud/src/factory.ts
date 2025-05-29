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
import {CvmInstanceService} from "./cvm/cvm.ts";

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

  function add(service: TencentCloudResourceService<unknown, unknown>) {
    result.set(service.resourceType, service);
  }

  add(new VpcService(provider, vpcClients));
  add(new SubnetService(provider, vpcClients));
  add(new CvmInstanceService(provider));
  return result;
}