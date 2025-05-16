import {TencentCloudProvider, TaggableResourceService} from "@/providers/tencent_cloud/provider";
import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models";
import {StatePart} from "@/index";

/**
 */
export class CvmInstanceService extends TaggableResourceService {
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

    loadByTags(resourceTags: ResourceTag[]): Promise<StatePart[]> {
        throw Error(`CvmInstanceService.load not impl: ${resourceTags}`)
    }

}