import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloudProviderConfig, TencentCloudResourceType} from "../provider.ts";
import {ResourceConfig, Resource} from "@qpa/core";
import {_CvmInstanceService, CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {ProviderRuntime} from "@qpa/core";
import {_CvmClientWrap} from "./client.ts";

export class CvmFactory {

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProviderConfig>,
              private cvmClient: _CvmClientWrap) {
  }

  private get provider(): _TencentCloudProviderConfig {
    return this.providerRuntime.providerConfig;
  }

  getClient(region: string): CvmClient {
    return this.cvmClient.getClient(region)!;
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    const service = this.provider._getService(TencentCloudResourceType.cvm_instance) as _CvmInstanceService;
    return await this.providerRuntime.apply(expected, service)
  }
}