import {_ClientWarp, _TencentCloudClientConfig} from "../provider.ts";
import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";

export class _VpcClientWarp extends _ClientWarp {
  private readonly vpcClients: Map<string, tc_VpcClient> = new Map();

  constructor(config: _TencentCloudClientConfig) {
    super(config)
  }

  getClient(region: string): tc_VpcClient {
    let result = this.vpcClients.get(region);
    if (!result) {
      result = new tc_VpcClient(this.getClientConfigByRegion(region));
      this.vpcClients.set(region, result);
    }
    return result;
  }
}