import {
  CreateSubnetRequest,
  Subnet as tc_Subnet
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import {TencentCloudType, TaggableResourceService, TencentCloudProvider} from "../provider.ts";
import {VpcClients} from "./_common.ts";
import {SpiConstants} from "@qpa/core/spi";

export interface SubnetSpec extends CreateSubnetRequest {
  Region: string;
}

export interface SubnetState extends tc_Subnet {
  Region: string;
}

/**
 */
export class SubnetService extends TaggableResourceService<SubnetSpec, SubnetState> {
  resourceType = TencentCloudType.vpc_subnet;

  constructor(readonly provider: TencentCloudProvider, readonly clients: VpcClients) {
    super();
  }

  async findOnePageByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<SubnetState>[]> {

    const client = this.clients.getClient(region);
    const response = await client.DescribeSubnets({
      SubnetIds: resourceIds,
      Limit: limit.toString(),
    });
    return (response.SubnetSet || []).map(this._toResourceInstanceFunc(region));
  }

  async create(specPart: ResourceConfig<SubnetSpec>): Promise<ResourceInstance<SubnetState>> {
    const client = this.clients.getClient(specPart.spec.Region);
    const response = await client.CreateSubnet({
      VpcId: specPart.spec.VpcId,
      SubnetName: specPart.spec.SubnetName,
      CidrBlock: specPart.spec.CidrBlock,
      Zone: specPart.spec.Zone,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: SpiConstants.tagNames.project, Value: this.provider.project.name},
        {Key: SpiConstants.tagNames.resource, Value: specPart.name},
      ],
    });
    const subnetId = response.Subnet?.SubnetId;
    if (!subnetId) {
      throw new Error("创建 Subnet 失败，未返回 subnetId");
    }
    console.log(`Subnet 创建成功，ID: ${subnetId}`);
    return this._toResourceInstanceFunc(specPart.spec.Region)(response.Subnet!);
  }

  async delete(...resources: ResourceInstance<SubnetState>[]): Promise<void> {
    for (const r of resources) {
      const state = r.state;
      const client = this.clients.getClient(state.Region);
      console.log(`Subnet删除，VpcId: ${state.VpcId} SubnetId:${state.SubnetId}`);
      await client.DeleteSubnet({SubnetId: state.SubnetId!})
      console.log(`Subnet删除，VpcId: ${state.VpcId} SubnetId:${state.SubnetId}`);
    }
  }

  async load(declare: ResourceConfig<SubnetSpec>): Promise<ResourceInstance<SubnetState>[]> {
    const client = this.clients.getClient(declare.spec.Region);
    const response = await client.DescribeSubnets({
      // VpcIds: resource.states.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(SpiConstants.tagNames.project)}`, Values: [this.provider.project.name]},
        {Name: `tag:${(SpiConstants.tagNames.resource)}`, Values: [declare.name]},
      ],
      Limit: this.resourceType!.pageLimit.toString(),
    });
    return (response.SubnetSet || []).map(this._toResourceInstanceFunc(declare.spec.Region));
  }

  private _toResourceInstanceFunc(region: string): (e: tc_Subnet) => ResourceInstance<SubnetState> {
    return (e: tc_Subnet) => {
      const resourceName = (e.TagSet ?? []).find(tag => tag.Key === SpiConstants.tagNames.resource)?.Value;
      return new ResourceInstance(this, resourceName || "", {
        ...e,
        // 如果有自己的字段
        Region: region
      });
    };
  }
}
