import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloud, _TencentCloudResourceFactory, TencentCloudResourceType} from "../provider.ts";
import {ResourceConfig, Resource} from "@qpa/core";
import {_CvmInstanceService, CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {ProviderRuntime} from "@qpa/core";
import {_CvmClientWrap} from "./client.ts";

export class CvmFactory extends _TencentCloudResourceFactory {

  constructor(tc: _TencentCloud,
              private readonly provider: ProviderRuntime, private cvmClient: _CvmClientWrap) {
    super(tc);
  }

  getClient(region: string): CvmClient {
    return this.cvmClient.getClient(region)!;
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    const service = this.getService(TencentCloudResourceType.cvm_instance) as _CvmInstanceService;
    return await this.provider.apply(expected, service)
  }
}