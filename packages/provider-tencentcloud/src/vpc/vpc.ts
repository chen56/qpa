import {
  CreateVpcRequest as tc_CreateVpcRequest,
  Vpc as tc_Vpc
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import {TencentCloudResourceType, _TaggableResourceService, _TencentCloud} from "../provider.ts";
import {Constants} from "@qpa/core";
import {_VpcClientWarp} from "./client.ts";

/*
ref:
  - terraform-provider-tencentcloud/tencentcloud/services/vpc/resource_tc_vpc.go
 */

export interface VpcSpec extends tc_CreateVpcRequest {
  Region: string;
}

export interface VpcVpcState extends tc_Vpc {
  Region: string;
  toString(): string;
}

/**
 */
export class _VpcService extends _TaggableResourceService<VpcSpec, VpcVpcState> {
  resourceType: TencentCloudResourceType = TencentCloudResourceType.vpc_vpc

  constructor(tc: _TencentCloud, private readonly vpcClient: _VpcClientWarp) {
    super(tc);
  }
  loadAll(): Promise<ResourceInstance<VpcVpcState>[]> {
    throw new Error("Method not implemented.");
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<VpcVpcState>[]> {
    const client = this.vpcClient.getClient(region);
    const response = await client.DescribeVpcs({
      VpcIds: resourceIds,
      Limit: limit.toString(),
    });
    return this._tcVpcSet2VpcState(region, response.VpcSet);
  }

  async create(specPart: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcVpcState>> {
    const client = this.vpcClient.getClient(specPart.spec.Region);
    const vpcResponse = await client.CreateVpc({
      VpcName: specPart.spec.VpcName,
      CidrBlock: specPart.spec.CidrBlock,
      EnableMulticast: specPart.spec.EnableMulticast,
      DnsServers: specPart.spec.DnsServers,
      DomainName: specPart.spec.DomainName,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: Constants.tagNames.project, Value: this.project.name},
        {Key: Constants.tagNames.resource, Value: specPart.name},
      ],
    });
    const vpcId = vpcResponse.Vpc?.VpcId;
    if (!vpcId) {
      throw new Error("创建 VPC 失败，未返回 VpcId");
    }
    console.log(`VPC 创建成功，ID: ${vpcId}`);
    return this._tcVpcSet2VpcState(specPart.spec.Region, [vpcResponse.Vpc!])![0];
  }

  async delete(...resources: ResourceInstance<VpcVpcState>[]): Promise<void> {
    for (const r of resources) {
      const state = r.state;
      const client = this.vpcClient.getClient(state.Region);
      console.log(`VPC删除准备，VpcId: ${state.VpcId}`);
      await client.DeleteVpc({VpcId: state.VpcId!})
      console.log(`VPC删除成功，VpcId: ${state.VpcId}`);
    }
  }

  async load(declare: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcVpcState>[]> {
    const client = this.vpcClient.getClient(declare.spec.Region);
    const response = await client.DescribeVpcs({
      // VpcIds: resource.states.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(Constants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(Constants.tagNames.resource)}`, Values: [declare.name]},
      ],
      Limit: this.resourceType!.queryLimit.toString(),
    });
    return this._tcVpcSet2VpcState(declare.spec.Region, response.VpcSet).map(e => e);
  }

  _tcVpcSet2VpcState(region: string, tc_vpcSet?: tc_Vpc[]): ResourceInstance<VpcVpcState>[] {
    const _this=this;
    const result = new Array<ResourceInstance<VpcVpcState>>;
    for (const vpc of tc_vpcSet ?? []) {
      const resourceName = (vpc.TagSet ?? []).find(tag => tag.Key === Constants.tagNames.resource)?.Value;
      const toState: VpcVpcState = {
        ...vpc,
        // 如果有自己的字段
        Region: region,
        toString() {
          return `${_this.resourceType.name}:${region}:${resourceName}:${this.VpcId}:${this.VpcName}`
        }
      };
      result.push(new ResourceInstance(this, resourceName || "", toState));
    }
    return result;
  }
}
