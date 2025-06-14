import {ProviderRuntime,} from "@qpa/core";
import {_TencentCloudProvider} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";

export class _VpcClientWarp {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>) {
  }

  private get provider(): _TencentCloudProvider {
    return this.providerRuntime.provider;
  }

  getClient(region: string): tc_VpcClient {
    let result = this.vpcClients.get(region);
    if (!result) {
      result = new tc_VpcClient(this.provider.getClientConfigByRegion(region));
      this.vpcClients.set(region, result);
    }
    return result;
  }
}