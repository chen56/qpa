import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {_TencentCloudAware, BaseServiceFactory, TencentCloudType} from "../provider.ts";
import {Resource, ResourceConfig} from "@qpa/core";
import {VpcSpec, VpcState} from "@qpa/provider-tencentcloud";
import {SubnetSpec, SubnetState} from "./subnet.ts";

export class VpcClients extends BaseServiceFactory {
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
    return await this._provider.apply(this._providerState, expected, TencentCloudType.vpc_vpc);
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    return await this._provider.apply(this._providerState, expected, TencentCloudType.vpc_subnet);
  }

}

