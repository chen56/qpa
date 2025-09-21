import {ResourceConfig, Resource} from "@qpa/core";
import {_VpcService, VpcSpec, VpcVpcState} from "./vpc.ts";
import {_TencentCloud, _TencentCloudResourceFactory, TencentCloudResourceType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {_SubnetService, VpcSubnetSpec, VpcSubnetState} from "./subnet.ts";
import {_VpcClientWarp} from "./client.ts";
import {Vendor} from "@qpa/core";

export class VpcFactory extends _TencentCloudResourceFactory {
  constructor(tc: _TencentCloud, private readonly vendor: Vendor, private readonly vpcClient: _VpcClientWarp) {
    super(tc);
  }

  getClient(region: string): tc_VpcClient {
    return this.vpcClient.getClient(region)!;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcVpcState>> {
    const service = this.vendor.resourceServices.get(TencentCloudResourceType.vpc_vpc) as _VpcService;
    return await this.vendor.apply(expected, service)
  }

  async subnet(expected: ResourceConfig<VpcSubnetSpec>): Promise<Resource<VpcSubnetSpec, VpcSubnetState>> {
    const service = this.vendor.resourceServices.get(TencentCloudResourceType.vpc_subnet) as _SubnetService;
    return await this.vendor.apply(expected, service)
  }
}