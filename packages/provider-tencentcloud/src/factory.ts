import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {
  TencentCloudType, TencentCloudCredential,
  TencentCloudProvider, TencentCloudResourceService, _TencentCloudClientsAware
} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
import {VpcLazyFactory} from "./vpc/factory.ts";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmClients} from "./cvm/_common.ts";
import {CvmFactory} from "./cvm/factory.ts";


import {ClientConfig as tc_ClientConfig} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client";

interface TencentCloudClientsProps {
  credential: TencentCloudCredential
}

export class TencentCloudClients implements _TencentCloudClientsAware {
  private readonly _credential: TencentCloudCredential;
  vpcClients: VpcClients;
  cvmClients: CvmClients;
  tagClient: tc_TagClient;

  constructor(readonly _project: Project, props: TencentCloudClientsProps) {
    this._credential = props.credential;
    this.vpcClients = new VpcClients(this);
    this.cvmClients = new CvmClients(this);

    this.tagClient = new tc_TagClient({
      credential: this._credential,
    });
    ``
  }


  public _getClientConfigByRegion(region: string): tc_ClientConfig {
    return {
      credential: this._credential,
      region: region,
    }
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
  static createFactory(clients: TencentCloudClients): TencentCloudFactory {
    const project = clients._project;

    const services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> = new Map();

    function add(service: TencentCloudResourceService<unknown, unknown>) {
      services.set(service.resourceType, service);
    }

    // vpc
    add(new VpcService(project, clients.vpcClients));
    add(new SubnetService(project, clients.vpcClients));

    // cvm
    add(new CvmInstanceService(project, clients.cvmClients));

    const provider = TencentCloudProvider.of(project, clients, {
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

  constructor(readonly provider: TencentCloudProvider, clients: TencentCloudClients) {
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
