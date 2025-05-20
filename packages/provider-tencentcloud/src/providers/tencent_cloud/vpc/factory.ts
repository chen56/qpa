import {PaPaResource, SpecPartProps, AppliedResource, SpecPart} from "@qpa/core";
import {Vpc, VpcService, VpcState} from "./vpc.ts";
import { TencentCloudProvider } from "../provider.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class VpcDirectFactory{
    constructor(readonly provider: TencentCloudProvider) {
    }

    async vpc(props: SpecPartProps<Vpc>) {
        const service= this.provider._getService(VpcService.resourceType) as VpcService;
        let spec  = new SpecPart<Vpc>(props);

        // todo get state first
        const state = await service.create(spec);

        return new AppliedResource(spec,state);
    }
}
/**
 * 工厂方法类
 */
export class VpcPlannedFactory {
    constructor(readonly provider: TencentCloudProvider) {
    }

    vpc(props: SpecPartProps<Vpc>) {
        return new PaPaResource<Vpc, VpcState>(this.provider, {
            ...props,
            service:this.provider._getService(VpcService.resourceType) as VpcService,
        });
    }
}