import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import {_TencentCloudAware} from "../provider.ts";

export class VpcClients {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(private readonly clients: _TencentCloudAware) {

  }

  getClient(region: string): tc_VpcClient {
    if (!this.vpcClients.has(region)) {
      const client = new tc_VpcClient(this.clients._getClientConfigByRegion(region));
      this.vpcClients.set(region, client);
    }
    return this.vpcClients.get(region)!;
  }
}

