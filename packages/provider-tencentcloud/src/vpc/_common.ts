import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {_TencentCloudAware, TencentCloudType} from "../provider.ts";
import {Resource, ResourceConfig} from "@qpa/core";
import {VpcSpec, VpcState} from "@qpa/provider-tencentcloud";
import {SubnetSpec, SubnetState} from "./subnet.ts";

export class VpcClients {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(private readonly tc: _TencentCloudAware) {

  }

  getClient(region: string): tc_VpcClient {
    if (!this.vpcClients.has(region)) {
      const client = new tc_VpcClient(this.tc._getClientConfigByRegion(region));
      this.vpcClients.set(region, client);
    }
    return this.vpcClients.get(region)!;
  }


  get _provider() {
    return this.tc._provider;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    return await this._provider.apply(expected, TencentCloudType.vpc_vpc);
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    return await this._provider.apply(expected, TencentCloudType.vpc_subnet);
  }

}

