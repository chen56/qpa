import {
  CreateSubnetRequest,
  Subnet as tc_Subnet
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import {TencentCloudResourceType, _TaggableResourceService, _TencentCloud} from "../provider.ts";
import {Constants} from "@qpa/core";
import {_VpcClientWarp} from "./client.ts";

export interface VpcSubnetSpec extends CreateSubnetRequest {
  Region: string;
}

export interface VpcSubnetState extends tc_Subnet {
  Region: string;
}

/**
 */
export class _SubnetService extends _TaggableResourceService<VpcSubnetSpec, VpcSubnetState> {
  resourceType = TencentCloudResourceType.vpc_subnet;

  constructor(tc: _TencentCloud, private readonly vpcClient: _VpcClientWarp) {
    super(tc);
  }
  loadAll(): Promise<ResourceInstance<VpcSubnetState>[]> {
    throw new Error("Method not implemented.");
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<VpcSubnetState>[]> {
    const client = this.vpcClient.getClient(region);
    const response = await client.DescribeSubnets({
      SubnetIds: resourceIds,
      Limit: limit.toString(),
    });
    return (response.SubnetSet || []).map(this._toResourceInstanceFunc(region));
  }

  async create(specPart: ResourceConfig<VpcSubnetSpec>): Promise<ResourceInstance<VpcSubnetState>> {
    const client = this.vpcClient.getClient(specPart.spec.Region);
    const response = await client.CreateSubnet({
      VpcId: specPart.spec.VpcId,
      SubnetName: specPart.spec.SubnetName,
      CidrBlock: specPart.spec.CidrBlock,
      Zone: specPart.spec.Zone,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: Constants.tagNames.project, Value: this.project.name},
        {Key: Constants.tagNames.resource, Value: specPart.name},
      ],
    });
    const subnetId = response.Subnet?.SubnetId;
    if (!subnetId) {
      throw new Error("创建 Subnet 失败，未返回 subnetId");
    }
    console.log(`Subnet 创建成功，ID: ${subnetId}`);
    return this._toResourceInstanceFunc(specPart.spec.Region)(response.Subnet!);
  }

  async delete(resources: ResourceInstance<VpcSubnetState>[]): Promise<void> {
    for (const r of resources) {
      const state = r.state;
      const client = this.vpcClient.getClient(state.Region);
      console.log(`Subnet删除准备，VpcId: ${state.VpcId} SubnetId:${state.SubnetId}`);
      await client.DeleteSubnet({SubnetId: state.SubnetId!})
      console.log(`Subnet删除成功，VpcId: ${state.VpcId} SubnetId:${state.SubnetId}`);
    }
  }

  async load(declare: ResourceConfig<VpcSubnetSpec>): Promise<ResourceInstance<VpcSubnetState>[]> {
    const client = this.vpcClient.getClient(declare.spec.Region);
    const response = await client.DescribeSubnets({
      // VpcIds: resource.states.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(Constants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(Constants.tagNames.resource)}`, Values: [declare.name]},
      ],
      Limit: this.resourceType!.queryLimit.toString(),
    });
    return (response.SubnetSet || []).map(this._toResourceInstanceFunc(declare.spec.Region));
  }

  private _toResourceInstanceFunc(region: string): (e: tc_Subnet) => ResourceInstance<VpcSubnetState> {
    return (e: tc_Subnet) => {
      const resourceName = (e.TagSet ?? []).find(tag => tag.Key === Constants.tagNames.resource)?.Value;
      return new ResourceInstance(this, resourceName || "", {
        ...e,
        // 如果有自己的字段
        Region: region
      });
    };
  }
}
