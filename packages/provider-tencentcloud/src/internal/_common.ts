import {Client as tc_VpcClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_client.js";
import { TencentCloudProvider } from "../provider.ts";

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

export class Arrays{
  /**
   * 将数组切片为多个固定大小的组。
   * @param array 要切片的数组。
   * @param chunkSize 每个组的大小。
   * @returns 包含多个组的数组。
   */
  static chunk<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      throw new Error("Chunk size must be a positive number.");
    }
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}