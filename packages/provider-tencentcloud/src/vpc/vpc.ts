import {
  CreateVpcRequest as tc_CreateVpcRequest,
  Vpc as tc_Vpc
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import {TencentCloudType, TaggableResourceService, TencentCloudProvider} from "../provider.ts";
import {VpcClients} from "../internal/_common.ts";
import {SpiConstants} from "@qpa/core/spi";


export interface VpcSpec extends tc_CreateVpcRequest {
  Region: string;
}

export interface VpcState extends tc_Vpc {
  Region: string;
}

/**
 */
export class VpcService extends TaggableResourceService<VpcSpec, VpcState> {
  resourceType: TencentCloudType = TencentCloudType.vpc_vpc

  constructor(readonly provider: TencentCloudProvider, readonly clients: VpcClients) {
    super();
  }

  async findOnePageByResourceId(region: string, resourceIds: string[], limit:number): Promise<ResourceInstance<VpcState>[]> {
    const client = this.clients.getClient(region);
    const response = await client.DescribeVpcs({
      VpcIds: resourceIds,
      Limit: limit.toString(),
    });
    return this._tcVpcSet2VpcState(region, response.VpcSet);
  }

  async create(specPart: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcState>> {
    const client = this.clients.getClient(specPart.spec.Region);
    const vpcResponse = await client.CreateVpc({
      VpcName: specPart.spec.VpcName,
      CidrBlock: specPart.spec.CidrBlock,
      EnableMulticast: specPart.spec.EnableMulticast,
      DnsServers: specPart.spec.DnsServers,
      DomainName: specPart.spec.DomainName,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: SpiConstants.tagNames.project, Value: this.provider.project.name},
        {Key: SpiConstants.tagNames.resource, Value: specPart.name},
      ],
    });
    const vpcId = vpcResponse.Vpc?.VpcId;
    if (!vpcId) {
      throw new Error("创建 VPC 失败，未返回 VpcId");
    }
    console.log(`VPC 创建成功，ID: ${vpcId}`);
    return this._tcVpcSet2VpcState(specPart.spec.Region, [vpcResponse.Vpc!])![0];
  }

  async delete(...resources: ResourceInstance<VpcState>[]): Promise<void> {
    for (const r of resources) {
      const state = r.state;
      const client = this.clients.getClient(state.Region);
      console.log(`VPC删除，VpcId: ${state.VpcId}`);
      await client.DeleteVpc({VpcId: state.VpcId!})
      console.log(`VPC删除成功，VpcId: ${state.VpcId}`);
    }
  }

  async load(declare: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcState>[]> {
    const client = this.clients.getClient(declare.spec.Region);
    const response = await client.DescribeVpcs({
      // VpcIds: resource.states.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(SpiConstants.tagNames.project)}`, Values: [this.provider.project.name]},
        {Name: `tag:${(SpiConstants.tagNames.resource)}`, Values: [declare.name]},
      ],
      Limit: this.resourceType!.pageLimit.toString(),
    });
    return this._tcVpcSet2VpcState(declare.spec.Region, response.VpcSet).map(e => e);
  }

  _tcVpcSet2VpcState(region: string, tc_vpcSet?: tc_Vpc[]): ResourceInstance<VpcState>[] {
    const result = new Array<ResourceInstance<VpcState>>;
    for (const vpc of tc_vpcSet ?? []) {
      const resourceName = (vpc.TagSet ?? []).find(tag => tag.Key === SpiConstants.tagNames.resource)?.Value;
      const toState: VpcState = {
        ...vpc,
        // 如果有自己的字段
        Region: region
      };
      result.push(new ResourceInstance(this, resourceName || "", toState));
    }
    return result;
  }
}
