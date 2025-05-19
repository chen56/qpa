import {  VpcService} from "./vpc/vpc.ts";
import {TencentCloudProvider, ResourceType, TencentCloudResourceService} from "./provider.ts";
import {VpcClients} from "./vpc/common.ts";

export function allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown,unknown>> {
    const result: Map<ResourceType, TencentCloudResourceService<unknown,unknown>> = new Map();
    const vpcClients: VpcClients = new VpcClients(provider);
    result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
    return result;
}
