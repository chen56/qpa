import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloudProvider} from "../provider.ts";
import {ProviderRuntime} from "@qpa/core";

export class _CvmClientWrap {
  private readonly vpcClients: Map<string, CvmClient> = new Map();

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>) {
  }

  private get provider(): _TencentCloudProvider {
    return this.providerRuntime.provider;
  }

  getClient(region: string): CvmClient {
    let result = this.vpcClients.get(region);
    if (!result) {
      result = new CvmClient(this.provider.getClientConfigByRegion(region));
      this.vpcClients.set(region, result);
    }
    return result;
  }
}