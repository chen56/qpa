import {VpcDirectFactory, VpcPlannedFactory} from "./vpc/factory.ts";
import { VpcService } from "./vpc/vpc.ts";
import { VpcClients } from "./vpc/_common.ts";
import {ResourceType, TencentCloudProvider, TencentCloudResourceService} from "./provider.ts";
import {LazyProject} from "@qpa/core";

export abstract class TencentCloud {
    protected constructor(readonly provider: TencentCloudProvider) {
    }

    static direct(param: { credential: { secretId: string; secretKey: string }; project: LazyProject }) {
        const tencentCloudProvider = new TencentCloudProvider(param.project, {
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
            allowedResourceServices: _allowServices
        });
        return new TencentCloudDirectFactory(tencentCloudProvider);
    }
}
/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudDirectFactory extends TencentCloud{
    readonly vpc: VpcDirectFactory;

    constructor(readonly provider: TencentCloudProvider) {
        super(provider);
        this.vpc = new VpcDirectFactory(this.provider);
    }

}
/**
 * 工厂方法类
 */
export class TencentCloudPlannedFactory extends TencentCloud {
    readonly vpc: VpcPlannedFactory;

    constructor(readonly provider: TencentCloudProvider) {
        super(provider);
        this.vpc = new VpcPlannedFactory(this.provider);
    }
}

function _allowServices(provider: TencentCloudProvider): Map<ResourceType, TencentCloudResourceService<unknown, unknown>> {
    const result: Map<ResourceType, TencentCloudResourceService<unknown, unknown>> = new Map();
    const vpcClients: VpcClients = new VpcClients(provider);
    result.set(VpcService.resourceType, new VpcService(provider, vpcClients));
    return result;
}