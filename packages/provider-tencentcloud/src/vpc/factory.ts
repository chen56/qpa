import {ProviderRuntime, Resource, ResourceConfig} from "@qpa/core";
import {VpcService, VpcSpec, VpcState} from "./vpc.ts";
import {_TencentCloudProvider, TencentCloudType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {SubnetService, SubnetSpec, SubnetState} from "./subnet.ts";

export class VpcFactory {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>) {

  }
  private get provider(): _TencentCloudProvider {
    return this.providerRuntime.provider;
  }
  getClient(region: string): tc_VpcClient {
    if (!this.vpcClients.has(region)) {
      const client = new tc_VpcClient(this.provider.getClientConfigByRegion(region));
      this.vpcClients.set(region, client);
    }
    return this.vpcClients.get(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    const service = this.provider._getService(TencentCloudType.vpc_vpc) as VpcService;
    return await this.providerRuntime.apply(expected, service)
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    const service = this.provider._getService(TencentCloudType.vpc_subnet) as SubnetService;
    return await this.providerRuntime.apply(expected, service)
  }
}

