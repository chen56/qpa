import {Client} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {_BaseClientWarp, _TencentCloudClientConfig} from "../provider.ts";

export class _CvmClientWrap extends _BaseClientWarp {
  private readonly client: Map<string, Client> = new Map();

  constructor(config: _TencentCloudClientConfig) {
    super(config)
  }

  getClient(region: string): Client {
    let result = this.client.get(region);
    if (!result) {
      result = new Client(this.getClientConfigByRegion(region));
      this.client.set(region, result);
    }
    return result;
  }
}