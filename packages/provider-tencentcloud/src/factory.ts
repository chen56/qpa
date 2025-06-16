import {VpcFactory} from "./vpc/factory.ts";
import {_VpcService} from "./vpc/vpc.ts";
import {_TencentCloudProvider, TencentCloudProviderProps} from "./provider.ts";
import {Project} from "@qpa/core";
import {_SubnetService} from "./vpc/subnet.ts";
import {_CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";
import {_VpcClientWarp} from "./vpc/client.ts";
import {_CvmClientWrap} from "./cvm/client.ts";

export interface TencentCloudProps extends TencentCloudProviderProps {

}

/**
 * 总的腾讯云工厂入口
 *
 * @public
 */
export class TencentCloud {
  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(project: Project, props: TencentCloudProps) {

    const provider = new _TencentCloudProvider(project, props);
    const providerRuntime=project.registerProvider(provider);

    // vpc
    const vpcClient =new _VpcClientWarp(providerRuntime);
    this.vpc = new VpcFactory(providerRuntime,vpcClient);

    provider.resourceServices.register(new _VpcService(providerRuntime,vpcClient));
    provider.resourceServices.register(new _SubnetService(providerRuntime, vpcClient));

    // cvm
    const cvmClient = new _CvmClientWrap(providerRuntime);
    this.cvm = new CvmFactory(providerRuntime);
    provider.resourceServices.register(new _CvmInstanceService(providerRuntime, cvmClient,vpcClient));

  }
}

