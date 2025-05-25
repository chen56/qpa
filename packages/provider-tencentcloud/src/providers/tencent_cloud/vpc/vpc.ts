import {
  CreateVpcRequest as tc_CreateVpcRequest,
  Vpc as tc_Vpc
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {ResourceTag as tc_ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {Constants, LazyResource, SpecPart, StatusPart} from "@qpa/core";
import {ResourceType, TaggableResourceService, TencentCloudProvider} from "../provider.ts";
import {VpcClients} from "./_common.ts";

export interface VpcSpec extends tc_CreateVpcRequest {
  Region: string;
}

export interface VpcStatus extends tc_Vpc {
  Region: string;
}

/**
 */
export class VpcService extends TaggableResourceService<VpcSpec, VpcStatus> {
  static resourceType: ResourceType = ResourceType.of({serviceType: "vpc", resourcePrefix: "vpc"})

  constructor(readonly provider: TencentCloudProvider, readonly clients: VpcClients) {
    super();
  }

  async loadByTags(resourceTags: tc_ResourceTag[]): Promise<StatusPart<VpcStatus>[]> {
    type Region = string;
    const regions = new Map<Region, tc_ResourceTag[]>

    const result = new Array<StatusPart<VpcStatus>>();
    for (const t of resourceTags) {
      if (!t.ResourceRegion) continue;
      if (!t.ResourceId) continue;

      let v = regions.get(t.ResourceRegion);
      if (!v) {
        v = new Array<tc_ResourceTag>();
        regions.set(t.ResourceRegion, v);
      }
      v.push(t);
    }

    for (const [region, resourceTag] of regions) {
      const client = this.clients.getClient(region);
      const vpcIds = resourceTag.map((r) => r.ResourceId!);
      //todo 分页？
      const response = await client.DescribeVpcs({
        VpcIds: vpcIds,
      });
      result.push(...this._tcVpcSet2VpcState(region, response.VpcSet));
    }
    return result;
  }

  async create(specPart: SpecPart<VpcSpec>): Promise<StatusPart<VpcStatus>> {
    const client = this.clients.getClient(specPart.spec.Region);
    const vpcResponse = await client.CreateVpc({
      VpcName: specPart.spec.VpcName,
      CidrBlock: specPart.spec.CidrBlock,
      EnableMulticast: specPart.spec.EnableMulticast,
      DnsServers: specPart.spec.DnsServers,
      DomainName: specPart.spec.DomainName,
      Tags: [...(specPart.spec.Tags ?? []),
        {Key: Constants.tagNames.project, Value: this.provider.scope.name},
        {Key: Constants.tagNames.resource, Value: specPart.name},
      ],
    });
    const vpcId = vpcResponse.Vpc?.VpcId;
    if (!vpcId) {
      throw new Error("创建 VPC 失败，未返回 VpcId");
    }
    console.log(`VPC 创建成功，ID: ${vpcId}`);
    // todo 应该先检查STATUS[]有效性
    return this._tcVpcSet2VpcState(specPart.spec.Region, [vpcResponse.Vpc!])![0];
  }

  async destroy(...statusParts: StatusPart<VpcStatus>[]): Promise<void> {
    for (const part of statusParts) {
      const status = part.status;
      const client = this.clients.getClient(status.Region);
      console.log(`VPC删除，VpcId: ${status.VpcId}`);
      await client.DeleteVpc({VpcId: status.VpcId!})
      console.log(`VPC删除成功，VpcId: ${status.VpcId}`);
    }
  }

  async refresh(resource: LazyResource<VpcSpec, VpcStatus>): Promise<void> {
    const params = {
      // VpcIds: resource.statuses.map(s => s.VpcId!)!,
      // 按标签过滤
      Filters: [
        {Name: `tag:${(Constants.tagNames.project)}`, Values: [this.provider.scope.name]},
        {Name: `tag:${(Constants.tagNames.resource)}`, Values: [resource.name]},
      ],
    };
    const client = this.clients.getClient(resource.spec.Region);
    const response = await client.DescribeVpcs(params);
    resource._statuses = this._tcVpcSet2VpcState(resource.spec.Region, response.VpcSet).map(e => e);
  }

  _tcVpcSet2VpcState(region: string, tc_vpcSet?: tc_Vpc[]): StatusPart<VpcStatus>[] {
    const result = new Array<StatusPart<VpcStatus>>;
    for (const vpc of tc_vpcSet ?? []) {
      const resourceName = (vpc.TagSet ?? []).find(tag => tag.Key === Constants.tagNames.resource)?.Value;
      if (!resourceName) {
        // 没找到qpa_key的是问题资源，暂时不管
        continue;
      }
      const toState: VpcStatus = {
        ...vpc,
        // 如果有自己的字段
        Region: region
      };
      result.push(new StatusPart(resourceName, toState));
    }
    return result;
  }
}
