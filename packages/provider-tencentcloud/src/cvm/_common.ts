import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_TencentCloudClientConfig} from "../provider.ts";

export class CvmClients {
    private readonly vpcClients: Map<string, CvmClient> = new Map();

    constructor(private readonly clientConfig: _TencentCloudClientConfig) {
    }

    getClient(region: string): CvmClient {
        if (!this.vpcClients.has(region)) {
            const client = new CvmClient(this.clientConfig._getClientConfigByRegion(region));
            this.vpcClients.set(region, client);
        }
        return this.vpcClients.get(region)!;
    }
}

