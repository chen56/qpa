import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {
  TencentCloudType, TencentCloudCredential,
  TencentCloudProvider, TencentCloudResourceService, _TencentCloudClientConfig
} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
import {VpcLazyFactory} from "./vpc/factory.ts";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmClients} from "./cvm/_common.ts";
import {CvmFactory} from "./cvm/factory.ts";

export class Clients {
  vpcClients: VpcClients;
  cvmClients: CvmClients;

  constructor(readonly project: Project, props: { credential: TencentCloudCredential }) {
    const config = new _TencentCloudClientConfig(props)

    this.vpcClients = new VpcClients(config);
    this.cvmClients = new CvmClients(config);
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
  static createFactory(clients: Clients, props: {
    credential: TencentCloudCredential;
  }): TencentCloudFactory {
    const project = clients.project;

    const services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> = new Map();

    function add(service: TencentCloudResourceService<unknown, unknown>) {
      services.set(service.resourceType, service);
    }

    // vpc
    add(new VpcService(project, clients.vpcClients));
    add(new SubnetService(project, clients.vpcClients));

    // cvm
    add(new CvmInstanceService(project, clients.cvmClients));

    const provider = TencentCloudProvider.of(project, {
      ...props,
      services: services,
    });
    return new TencentCloudFactory(provider, clients);
  }
}

/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudFactory extends TencentCloud {
  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(readonly provider: TencentCloudProvider, clients: Clients) {
    super(provider);
    this.vpc = new VpcFactory(this.provider, clients.vpcClients);
    this.cvm = new CvmFactory(this.provider, clients.cvmClients);
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
