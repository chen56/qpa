import {LazyProject, LazyResource, Resource, ResourceConfig} from "@qpa/core";
import {VpcService, VpcSpec, VpcState} from "./vpc.ts";
import {_TencentCloudAware, BaseServiceFactory, TencentCloudProvider, TencentCloudType} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {SubnetSpec, SubnetState} from "./subnet.ts";

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
    return await this._provider.apply(this._providerState, expected, TencentCloudType.vpc_vpc);
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    return await this._provider.apply(this._providerState, expected, TencentCloudType.vpc_subnet);
  }

}



/**
 * 工厂方法类
 */
export class VpcLazyFactory {
  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
  }

  vpc(props: ResourceConfig<VpcSpec>): LazyResource<VpcSpec, VpcState> {
    const result = new LazyResource<VpcSpec, VpcState>(this.provider, {
      ...props,
      service: this.provider._getService(TencentCloudType.vpc_vpc) as VpcService,
    });
    this.project._configuredResources.push(result);
    return result;
  }
}
