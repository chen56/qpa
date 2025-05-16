import {
    Vpc as tc_Vpc,
    CreateVpcRequest as tc_CreateVpcRequest
} from "tencentcloud-sdk-nodejs/tencentcloud/services/vpc/v20170312/vpc_models.js";
import {
    ResourceTag as tc_ResourceTag
} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {PaPaResource, Constants, StatePart, SpecPart} from "@/index.ts";
import {
    ResourceType,
    TencentCloudProvider,
    TaggableResourceService,
} from "@/providers/tencent_cloud/provider.ts";
import {VpcClients} from "@/providers/tencent_cloud/vpc/common.ts";

export interface Vpc extends tc_CreateVpcRequest {
    Region: string;
}

export interface VpcState extends tc_Vpc {
    Region: string;
}

/**
 */
export class VpcService extends TaggableResourceService<Vpc,VpcState> {
    static resourceType: ResourceType = ResourceType.of({serviceType: "vpc", resourcePrefix: "vpc"})

    constructor(readonly provider: TencentCloudProvider, readonly clients: VpcClients) {
        super();
    }

    async loadByTags(resourceTags: tc_ResourceTag[]): Promise<StatePart<VpcState>[]> {
        type Region=string;
        const regions = new Map<Region, tc_ResourceTag[]>

        const result = new Array<StatePart<VpcState>>();
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

    async create(specPart: SpecPart<Vpc>): Promise<StatePart<VpcState>> {
        const client = this.clients.getClient(specPart.spec.Region);
        const vpcResponse = await client.CreateVpc({
            VpcName: specPart.spec.VpcName,
            CidrBlock: specPart.spec.CidrBlock,
            EnableMulticast: specPart.spec.EnableMulticast,
            DnsServers: specPart.spec.DnsServers,
            DomainName: specPart.spec.DomainName,
            Tags: [...(specPart.spec.Tags ?? []),
                {Key: Constants.tagNames.project, Value: this.provider.project.name},
                {Key: Constants.tagNames.resource, Value: specPart.name},
            ],
        });
        const vpcId = vpcResponse.Vpc?.VpcId;
        if (!vpcId) {
            throw new Error("创建 VPC 失败，未返回 VpcId");
        }
        console.log(`VPC 创建成功，ID: ${vpcId}`);
        // todo 应该先检查state[]有效性
        return this._tcVpcSet2VpcState(specPart.spec.Region,[vpcResponse.Vpc!])![0];
    }

    async destroy(resource: PaPaResource<Vpc, VpcState>): Promise<void> {
        const client = this.clients.getClient(resource.spec.Region);
        for (const state of resource.states) {
            console.log(`VPC删除，VpcId: ${state.VpcId}`);
            await client.DeleteVpc({VpcId: state.VpcId!})
            console.log(`VPC删除成功，VpcId: ${state.VpcId}`);
        }
    }

    async refresh(resource: PaPaResource<Vpc, VpcState>): Promise<void> {
        const params = {
            // VpcIds: resource.states.map(s => s.VpcId!)!,
            // 按标签过滤
            Filters: [
                {Name: `tag:${(Constants.tagNames.project)}`, Values: [this.provider.project.name]},
                {Name: `tag:${(Constants.tagNames.resource)}`, Values: [resource.name]},
            ],
        };
        const client = this.clients.getClient(resource.spec.Region);
        const response = await client.DescribeVpcs(params);
        resource._states = this._tcVpcSet2VpcState(resource.spec.Region, response.VpcSet).map(e=>e.state);
    }

    _tcVpcSet2VpcState(region :string,tc_vpcSet?: tc_Vpc[]): StatePart<VpcState>[] {
        const result=new Array<StatePart<VpcState>>;
        for (const vpc of tc_vpcSet??[]) {
            const resourceName = (vpc.TagSet ?? []).find(tag => tag.Key === Constants.tagNames.resource)?.Value;
            if (!resourceName) {
                // 没找到pa_key的是问题资源，暂时不管
                continue;
            }
            const toState:VpcState = {
                ...vpc,
                // 如果有自己的字段
                Region: region
            };
            result.push(new StatePart(resourceName, toState));
        }
        return result;
    }
}
