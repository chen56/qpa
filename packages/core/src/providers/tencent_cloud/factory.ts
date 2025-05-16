import {TencentCloudProvider} from "@/providers/tencent_cloud/provider.ts";
import {VpcDirectFactory, VpcPlannedFactory} from "@/providers/tencent_cloud/vpc/factory.ts";


/**
 * 工厂方法类
 * 命名模式：[Provider][Mode]Factory
 */
export class TencentCloudDirectFactory {
    readonly vpc: VpcDirectFactory;

    constructor(readonly provider: TencentCloudProvider) {
        this.vpc = new VpcDirectFactory(this.provider);
    }
}
/**
 * 工厂方法类
 */
export class TencentCloudPlannedFactory {
    readonly vpc: VpcPlannedFactory;

    constructor(readonly provider: TencentCloudProvider) {
        this.vpc = new VpcPlannedFactory(this.provider);
    }
}