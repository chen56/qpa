import {TencentCloudProvider, TaggableResourceService} from "@/providers/tencent_cloud/provider.ts";
import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {PaPaResource, SpecPart, StatePart} from "@/index.ts";
import {VpcState} from "@/providers/tencent_cloud/vpc/vpc.ts";


class Cvm{

}
class CvmState{

}
/**
 */
export class CvmInstanceService extends TaggableResourceService<Cvm,CvmState> {
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

    loadByTags(resourceTags: ResourceTag[]): Promise<StatePart<CvmState>[]> {
        throw Error(`CvmInstanceService.load not impl: ${resourceTags}`)
    }

    create(resource: SpecPart<Cvm>): Promise<StatePart<VpcState>> {
        console.log(resource)
        throw new Error("not implements")
    }

    destroy(resource: PaPaResource<Cvm, CvmState>): Promise<void> {
        console.log(resource)

        throw new Error("not implements")
    }

    refresh(resource: PaPaResource<Cvm, CvmState>): Promise<void> {
        console.log(resource)

        throw new Error("not implements")
    }

}