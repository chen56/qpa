import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {_TencentCloudProvider, TencentCloudProviderProps} from "./provider.ts";
import {Project} from "@qpa/core";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";

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
    this.vpc = new VpcFactory(providerRuntime);
    provider.services.register(new VpcService(project, this.vpc));
    provider.services.register(new SubnetService(project, this.vpc));

    // cvm
    this.cvm = new CvmFactory(providerRuntime);
    provider.services.register(new CvmInstanceService(project, this.cvm));

  }
}

