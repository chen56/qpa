import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import { TaggableResourceService, TencentCloudProvider } from "../provider.ts";
import { VpcState } from "../vpc/vpc.ts";


class CvmSpec{

}
class CvmState{

}
/**
 */
export class CvmInstanceService extends TaggableResourceService<CvmSpec,CvmState> {
    readonly serviceType: string = "vpc";
    readonly resourcePrefix: string = "vpc";

    private readonly cvmClients: Map<string, CvmClient> = new Map();

    constructor(readonly provider: TencentCloudProvider) {
        super();
    }


    getCvmClient(region: string): CvmClient {
        if (!this.cvmClients.has(region)) {
            const client = new CvmClient(this.provider._getClientConfigByRegion(region));
            this.cvmClients.set(region, client);
        }
        return this.cvmClients.get(region)!;
    }

    findByTags(resourceTags: ResourceTag[]): Promise<ResourceInstance<CvmState>[]> {
        throw Error(`CvmInstanceService.load not impl: ${resourceTags}`)
    }

    create(resource: ResourceConfig<CvmSpec>): Promise<ResourceInstance<VpcState>> {
        console.log(resource)
        throw new Error("not implements")
    }

    delete(...resource: ResourceInstance<CvmState>[]): Promise<void> {
        console.log(resource)

        throw new Error("not implements")
    }

    load(specPart: ResourceConfig<CvmSpec>): Promise<ResourceInstance<CvmState>[]> {
        console.log(specPart)
        throw new Error("not implements")
    }

}