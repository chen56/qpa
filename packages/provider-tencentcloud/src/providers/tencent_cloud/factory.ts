import {VpcDirectFactory, VpcPlannedFactory} from "./vpc/factory.ts";
import {ResourceType, TencentCloudProvider, TencentCloudResourceService} from "./provider.js";
import {VpcClients} from "./vpc/common.js";
import {VpcService} from "./vpc/index.js";

export abstract class TencentCloudFactory{
    constructor(readonly provider: TencentCloudProvider) {
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