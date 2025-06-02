import {LazyProject, LazyResource, Resource, ResourceConfig} from "@qpa/core";
import {VpcService, VpcSpec, VpcState} from "./vpc.ts";
import {TencentCloudType, TencentCloudProvider, _TencentCloudAware} from "../provider.ts";
import {SubnetSpec, SubnetState} from "./subnet.ts";
import {VpcClients} from "./_common.ts";

/**
 * 工厂类
 */
export class VpcFactory {
  constructor(readonly _tc: _TencentCloudAware, readonly clients: VpcClients) {
  }

  get _provider() {
    return this._tc._provider;
  }

  async vpc(expected: ResourceConfig<VpcSpec>): Promise<Resource<VpcSpec, VpcState>> {
    return await this._provider.apply(expected, TencentCloudType.vpc_vpc);
  }

  async subnet(expected: ResourceConfig<SubnetSpec>): Promise<Resource<SubnetSpec, SubnetState>> {
    return await this._provider.apply(expected, TencentCloudType.vpc_subnet);
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