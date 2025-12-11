import {ResourceConfig, Resource} from "@planc/core";
import {VpcSpec, VpcState} from "./vpc.ts";
import {_TencentCloudContext, _ResourceFactory, TencentCloudResourceType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {VpcSubnetSpec, VpcSubnetState} from "./subnet.ts";
import {_VpcClientWarp} from "./client.ts";
import {Vendor} from "@planc/core";

export class VpcFactory extends _ResourceFactory {
  constructor(tc: _TencentCloudContext, private readonly vendor: Vendor, private readonly vpcClients: _VpcClientWarp) {
    super(tc);
  }

  getClient(region: string): tc_VpcClient {
    return this.vpcClients.getClient(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    return await this.vendor.up(TencentCloudResourceType.vpc_vpc, expected)
  }

  async subnet(expected: ResourceConfig<VpcSubnetSpec>): Promise<Resource<VpcSubnetSpec, VpcSubnetState>> {
    return await this.vendor.up(TencentCloudResourceType.vpc_subnet,expected)
  }
}