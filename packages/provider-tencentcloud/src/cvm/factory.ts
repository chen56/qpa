import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloud, _ResourceFactory, TencentCloudResourceType} from "../provider.ts";
import {ResourceConfig, Resource} from "@qpa/core";
import {CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {Vendor} from "@qpa/core";
import {_CvmClientWrap} from "./client.ts";

export class CvmFactory extends _ResourceFactory {

  constructor(tc: _TencentCloud,
              private readonly vendor: Vendor, private cvmClient: _CvmClientWrap) {
    super(tc);
  }

  getClient(region: string): CvmClient {
    return this.cvmClient.getClient(region)!;
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    return await this.vendor.up(TencentCloudResourceType.cvm_instance,expected)
  }
}