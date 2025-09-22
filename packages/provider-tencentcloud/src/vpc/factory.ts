import {ResourceConfig, Resource} from "@qpa/core";
import {VpcSpec, VpcState} from "./vpc.ts";
import {_TencentCloud, _ResourceFactory, TencentCloudResourceType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {VpcSubnetSpec, VpcSubnetState} from "./subnet.ts";
import {_VpcClientWarp} from "./client.ts";
import {Vendor} from "@qpa/core";

export class VpcFactory extends _ResourceFactory {
  constructor(tc: _TencentCloud, private readonly vendor: Vendor, private readonly vpcClients: _VpcClientWarp) {
    super(tc);
  }

  getClient(region: string): tc_VpcClient {
    return this.vpcClients.getClient(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    return await this.vendor.apply(TencentCloudResourceType.vpc_vpc, expected)
  }

  async subnet(expected: ResourceConfig<VpcSubnetSpec>): Promise<Resource<VpcSubnetSpec, VpcSubnetState>> {
    return await this.vendor.apply(TencentCloudResourceType.vpc_subnet,expected)
  }
}