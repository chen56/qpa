import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloudAware, BaseServiceFactory, TencentCloudType} from "../provider.ts";
import {Resource, ResourceConfig} from "@qpa/core";
import {CvmInstanceService, CvmInstanceSpec, CvmInstanceState} from "./instance.ts";

export class CvmFactory extends BaseServiceFactory {
    private readonly vpcClients: Map<string, CvmClient> = new Map();

    constructor(tc: _TencentCloudAware) {
        super(tc);
    }

    getClient(region: string): CvmClient {
        if (!this.vpcClients.has(region)) {
            const client = new CvmClient(this._tc._getClientConfigByRegion(region));
            this.vpcClients.set(region, client);
        }
        return this.vpcClients.get(region)!;
    }

    async instance(expected: ResourceConfig<CvmInstanceSpec>): Promise<Resource<CvmInstanceSpec, CvmInstanceState>> {
        const service = this._getService(TencentCloudType.cvm_instance) as CvmInstanceService;
        return await this._providerState.apply(expected, service)
    }
}