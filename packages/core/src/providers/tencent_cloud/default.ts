import {  VpcService} from "@/providers/tencent_cloud/vpc/vpc.ts";
import {TencentCloudProvider, ResourceType, TencentCloudResourceService} from "@/providers/tencent_cloud/provider.ts";
import {VpcClients} from "@/providers/tencent_cloud/vpc/common.ts";

export function allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown,unknown>> {
    const result: Map<ResourceType, TencentCloudResourceService<unknown,unknown>> = new Map();
    const vpcClients: VpcClients = new VpcClients(provider);
    result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
    return result;
}
