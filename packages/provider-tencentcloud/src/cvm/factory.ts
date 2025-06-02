import {Resource, ResourceConfig} from "@qpa/core";
import {_TencentCloudAware, BaseServiceFactory, TencentCloudType} from "../provider.ts";
import {CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {CvmClients} from "./_common.ts";

/**
 * 工厂类
 */
export class CvmFactory extends BaseServiceFactory {
  constructor(_tc: _TencentCloudAware, readonly clients: CvmClients) {
    super(_tc);
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    return await this._provider.apply(this._providerState, expected, TencentCloudType.cvm_instance);
  }
}
