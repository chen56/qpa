import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloudProvider, TencentCloudResourceType} from "../provider.ts";
import {ProviderRuntime, ResourceConfig, Resource} from "@qpa/core";
import {_CvmInstanceService, CvmInstanceSpec, CvmInstanceState} from "./instance.ts";

export class CvmFactory {
  private readonly vpcClients: Map<string, CvmClient> = new Map();

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>) {
  }

  private get provider(): _TencentCloudProvider {
    return this.providerRuntime.provider;
  }

  getClient(region: string): CvmClient {
    if (!this.vpcClients.has(region)) {
      const client = new CvmClient(this.provider.getClientConfigByRegion(region));
      this.vpcClients.set(region, client);
    }
    return this.vpcClients.get(region)!;
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    const service = this.provider._getService(TencentCloudResourceType.cvm_instance) as _CvmInstanceService;
    return await this.providerRuntime.apply(expected, service)
  }
}