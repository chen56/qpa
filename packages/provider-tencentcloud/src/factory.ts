import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {VpcClients} from "./vpc/_common.ts";
import {
  TencentCloudType, TencentCloudCredential,
  TencentCloudProvider, TencentCloudResourceService, _TencentCloudAware
} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
import {VpcLazyFactory} from "./vpc/factory.ts";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmClients} from "./cvm/_common.ts";
import {CvmFactory} from "./cvm/factory.ts";


import {ClientConfig as tc_ClientConfig} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client";

interface TencentCloudProps {
  credential: TencentCloudCredential
}

/**
 * 总的腾讯云工厂入口
 *
 * @public
 */
export class TencentCloud implements _TencentCloudAware {
  private readonly _credential: TencentCloudCredential;
  readonly _provider: TencentCloudProvider;
  readonly factory: TencentCloudFactory;

  vpcClients: VpcClients;
  cvmClients: CvmClients;
  tagClient: tc_TagClient;

  constructor(readonly _project: Project, props: TencentCloudProps) {
    this._credential = props.credential;
    this.vpcClients = new VpcClients(this);
    this.cvmClients = new CvmClients(this);

    this.tagClient = new tc_TagClient({
      credential: this._credential,
    });


    const services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> = new Map();

    function add(service: TencentCloudResourceService<unknown, unknown>) {
      services.set(service.resourceType, service);
    }

    // vpc
    add(new VpcService(_project, this.vpcClients));
    add(new SubnetService(_project, this.vpcClients));

    // cvm
    add(new CvmInstanceService(_project, this.cvmClients));

    this._provider = TencentCloudProvider.of(_project, this, {
      services: services,
    });
    this.factory = new TencentCloudFactory(this._provider, this);
  }


  public _getClientConfigByRegion(region: string): tc_ClientConfig {
    return {
      credential: this._credential,
      region: region,
    }
  }

}

/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudFactory {
  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(readonly provider: TencentCloudProvider, clients: TencentCloud) {
    this.vpc = new VpcFactory(this.provider, clients.vpcClients);
    this.cvm = new CvmFactory(this.provider, clients.cvmClients);
  }
}

/**
 * @public
 */
export class LazyModeTencentCloudFactory {
  readonly vpc: VpcLazyFactory;

  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
    this.vpc = new VpcLazyFactory(this.project, this.provider);
  }
}
