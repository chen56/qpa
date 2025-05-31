import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {TencentCloudProvider} from "../provider.ts";

export class VpcClients {
    private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

    constructor(readonly provider: TencentCloudProvider) {
    }

    getClient(region: string): tc_VpcClient {
        if (!this.vpcClients.has(region)) {
            const client = new tc_VpcClient(this.provider._getClientConfigByRegion(region));
            this.vpcClients.set(region, client);
        }
        return this.vpcClients.get(region)!;
    }
}

