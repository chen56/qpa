import {
  CreateVpcRequest as tc_CreateVpcRequest,
  Vpc as tc_Vpc
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ProviderRuntime, ResourceConfig, ResourceInstance} from "@qpa/core";
import {TencentCloudResourceType, _TaggableResourceService, _TencentCloudProvider} from "../provider.ts";
import {SpiConstants} from "@qpa/core/spi";
import {_VpcClientWarp} from "./client.ts";


export interface VpcSpec extends tc_CreateVpcRequest {
  Region: string;
}

export interface VpcState extends tc_Vpc {
  Region: string;
}

/**
 */
export class _VpcService extends _TaggableResourceService<VpcSpec, VpcState> {
  loadAll(): Promise<ResourceInstance<VpcState>[]> {
      throw new Error("Method not implemented.");
  }
  resourceType: TencentCloudResourceType = TencentCloudResourceType.vpc_vpc

  constructor(private readonly providerRuntime: ProviderRuntime<_TencentCloudProvider>, private readonly vpcClient: _VpcClientWarp) {
    super();
  }

  private get project(){
    return this.providerRuntime.project;
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<VpcState>[]> {
    const client = this.vpcClient.getClient(region);
    const response = await client.DescribeVpcs({
      VpcIds: resourceIds,
      Limit: limit.toString(),
    });
    return this._tcVpcSet2VpcState(region, response.VpcSet);
  }

  async create(specPart: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcState>> {
    const client = this.vpcClient.getClient(specPart.spec.Region);
    const vpcResponse = await client.CreateVpc({
      VpcName: specPart.spec.VpcName,
      CidrBlock: specPart.spec.CidrBlock,
      EnableMulticast: specPart.spec.EnableMulticast,
      DnsServers: specPart.spec.DnsServers,
      DomainName: specPart.spec.DomainName,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: SpiConstants.tagNames.project, Value: this.project.name},
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
      const client = this.vpcClient.getClient(state.Region);
      console.log(`VPC删除准备，VpcId: ${state.VpcId}`);
      await client.DeleteVpc({VpcId: state.VpcId!})
      console.log(`VPC删除成功，VpcId: ${state.VpcId}`);
    }
  }

  async load(declare: ResourceConfig<VpcSpec>): Promise<ResourceInstance<VpcState>[]> {
    const client = this.vpcClient.getClient(declare.spec.Region);
    const response = await client.DescribeVpcs({
      // VpcIds: resource.states.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(SpiConstants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(SpiConstants.tagNames.resource)}`, Values: [declare.name]},
      ],
      Limit: this.resourceType!.queryLimit.toString(),
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
