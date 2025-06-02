import {Resource, ResourceConfig} from "@qpa/core";
import {_TencentCloudAware, TencentCloudType} from "../provider.ts";
import {CvmInstanceSpec, CvmInstanceState} from "./instance.ts";
import {CvmClients} from "./_common.ts";

/**
 * 工厂类
 */
export class CvmFactory {
  constructor(readonly _tc: _TencentCloudAware, readonly clients: CvmClients) {
  }

  get _provider() {
    return this._tc._provider;
  }

  async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
    return await this._provider.apply(expected, TencentCloudType.cvm_instance);
  }
}
