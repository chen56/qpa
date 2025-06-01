import {TencentCloudProvider} from "@qpa/provider-tencentcloud";
import {Resource, ResourceConfig} from "@qpa/core";
import {TencentCloudType} from "../provider.ts";
import {CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {CvmClients} from "./_common.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class CvmFactory {
  constructor(readonly provider: TencentCloudProvider, readonly cvmClients: CvmClients) {
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    return await this.provider.apply(expected, TencentCloudType.cvm_instance);
  }
}
