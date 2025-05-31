import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {ResourceConfig, ResourceInstance} from "@qpa/core";
import {TaggableResourceService, TencentCloudProvider, TencentCloudType} from "../provider.ts";


class CvmInstanceSpec {

}

class CvmInstanceState {

}

/**
 */
export class CvmInstanceService extends TaggableResourceService<CvmInstanceSpec, CvmInstanceState> {
  readonly resourceType = TencentCloudType.cvm_instance;

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

  async findOnePageByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<CvmInstanceState>[]> {
    throw Error(`CvmInstanceService.load not impl: ${resourceIds}`)
  }

  create(resource: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>> {
    console.log(resource)
    throw new Error("not implements")
  }

  delete(...resource: ResourceInstance<CvmInstanceState>[]): Promise<void> {
    console.log(resource)

    throw new Error("not implements")
  }

  load(specPart: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>[]> {
    console.log(specPart)
    throw new Error("not implements")
  }

}