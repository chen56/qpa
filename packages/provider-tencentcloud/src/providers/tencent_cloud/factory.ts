import {VpcDirectFactory, VpcPlannedFactory} from "./vpc/factory.ts";
import { VpcService } from "./vpc/vpc.ts";
import { VpcClients } from "./vpc/common.ts";
import {ResourceType, TencentCloudProvider, TencentCloudResourceService} from "./provider.ts";

export abstract class TencentCloudFactory{
    protected constructor(readonly provider: TencentCloudProvider) {
    }
}
/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudDirectFactory extends TencentCloudFactory{
    readonly vpc: VpcDirectFactory;

    constructor(readonly provider: TencentCloudProvider) {
        super(provider);
        this.vpc = new VpcDirectFactory(this.provider);
    }
}
/**
 * 工厂方法类
 */
export class TencentCloudPlannedFactory extends TencentCloudFactory {
    readonly vpc: VpcPlannedFactory;

    constructor(readonly provider: TencentCloudProvider) {
        super(provider);
        this.vpc = new VpcPlannedFactory(this.provider);
    }
}

export function allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown, unknown>> {
    const result: Map<ResourceType, TencentCloudResourceService<unknown, unknown>> = new Map();
    const vpcClients: VpcClients = new VpcClients(provider);
    result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
    return result;
}