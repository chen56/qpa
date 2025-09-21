import {VpcFactory} from "./vpc/factory.ts";
import {_VpcService} from "./vpc/vpc.ts";
import {_TencentCloudProvider, _TencentCloud, TencentCloudCredential} from "./provider.ts";
import {Project} from "@qpa/core";
import {_SubnetService} from "./vpc/subnet.ts";
import {_CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";
import {_VpcClientWarp} from "./vpc/client.ts";
import {_CvmClientWrap} from "./cvm/client.ts";

export interface TencentCloudConfig {
  credential: TencentCloudCredential
}

/**
 * 总的腾讯云工厂入口
 *
 * @public
 */
export class TencentCloud {
  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(project: Project, config: TencentCloudConfig) {

    const providerRuntime = project.registerProvider(new _TencentCloudProvider(project, config));
    const tc = new _TencentCloud(project, providerRuntime);

    // vpc
    const vpcClient = new _VpcClientWarp(config);
    this.vpc = new VpcFactory(tc, providerRuntime, vpcClient);

    providerRuntime.resourceServices.register(new _VpcService(tc, vpcClient));
    providerRuntime.resourceServices.register(new _SubnetService(tc, vpcClient));

    // cvm
    const cvmClient = new _CvmClientWrap(config);
    this.cvm = new CvmFactory(tc, providerRuntime, cvmClient);
    providerRuntime.resourceServices.register(new _CvmInstanceService(tc, cvmClient, vpcClient));

  }
}