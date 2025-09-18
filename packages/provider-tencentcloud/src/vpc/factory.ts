import {ProviderRuntime, Resource, ResourceConfig} from "@qpa/core";
import {_VpcService, VpcSpec, VpcVpcState} from "./vpc.ts";
import {_TencentCloudProvider, TencentCloudResourceType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {_SubnetService, VpcSubnetSpec, VpcSubnetState} from "./subnet.ts";
import {_VpcClientWarp} from "./client.ts";

export class VpcFactory {
  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>,private readonly vpcClient: _VpcClientWarp) {
  }

  private get provider(): _TencentCloudProvider {
    return this.providerRuntime.provider;
  }

  getClient(region: string): tc_VpcClient {
    return this.vpcClient.getClient(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcVpcState>> {
    const service = this.provider._getService(TencentCloudResourceType.vpc_vpc) as _VpcService;
    return await this.providerRuntime.apply(expected, service)
  }

  async subnet(expected: ResourceConfig<VpcSubnetSpec>): Promise<Resource<VpcSubnetSpec, VpcSubnetState>> {
    const service = this.provider._getService(TencentCloudResourceType.vpc_subnet) as _SubnetService;
    return await this.providerRuntime.apply(expected, service)
  }
}