import {Resource, ResourceConfig} from "@qpa/core";
import {VpcService, VpcSpec, VpcState} from "./vpc.ts";
import {_TencentCloudAware, BaseServiceFactory, TencentCloudType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {SubnetService, SubnetSpec, SubnetState} from "./subnet.ts";

export class VpcFactory extends BaseServiceFactory {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(tc: _TencentCloudAware) {
    super(tc);
  }

  getClient(region: string): tc_VpcClient {
    if (!this.vpcClients.has(region)) {
      const client = new tc_VpcClient(this._tc._getClientConfigByRegion(region));
      this.vpcClients.set(region, client);
    }
    return this.vpcClients.get(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    const service = this._getService(TencentCloudType.vpc_vpc) as VpcService;
    return await this._providerState.apply(expected, service)
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    const service = this._getService(TencentCloudType.vpc_subnet) as SubnetService;
    return await this._providerState.apply(expected, service)
  }
}

