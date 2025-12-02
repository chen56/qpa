import {VpcFactory} from "./vpc/factory.ts";
import {_VpcService} from "./vpc/vpc.ts";
import {_TencentCloudContext, _TencentCloudProvider, _Runners, TencentCloudCredential} from "./provider.ts";
import {Project} from "@qpa/core";
import {_SubnetService} from "./vpc/subnet.ts";
import {_CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";
import {_VpcClientWarp} from "./vpc/client.ts";
import {_CvmClientWrap} from "./cvm/client.ts";
import {_TagClientWarp} from "./internal/tag_service.ts";

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

    const runners = new _Runners();
    const tcContext = new _TencentCloudContext(project, runners);

    const tagClient = new _TagClientWarp(tcContext, config);

    const provider = new _TencentCloudProvider(project, tagClient);
    const vendor = project.vendors.register(provider);

    // vpc
    const vpcClient = new _VpcClientWarp(config);
    this.vpc = new VpcFactory(tcContext, vendor, vpcClient);

    provider.resourceServices.register(new _VpcService(tcContext, vpcClient));
    provider.resourceServices.register(new _SubnetService(tcContext, vpcClient));

    // cvm
    const cvmClient = new _CvmClientWrap(config);
    this.cvm = new CvmFactory(tcContext, vendor, cvmClient);
    provider.resourceServices.register(new _CvmInstanceService(tcContext, cvmClient, vpcClient, tagClient));
  }
}