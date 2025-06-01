import {Client as CvmClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_client.js";
import {RunInstancesRequest, Instance} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models.js";
import {Project, ResourceConfig, ResourceInstance} from "@qpa/core";
import {TaggableResourceService, TencentCloudType} from "../provider.ts";
import {CvmClients} from "./_common.ts";
import {SpiConstants} from "@qpa/core/spi";


/**
 *
 *  CVM实例
 *
 *  @remarks
 *   总的来说，只支持按小时后付费(POSTPAID_BY_HOUR)、竞价付费(SPOTPAID)的普通实例，不支持CDC/CDH等特殊机型和集群模式
 *
 *   InstanceChargeType 只支持:
 *   - POSTPAID_BY_HOUR: 按小时后付费
 *   - SPOTPAID：竞价付费
 *
 *   不支持以下属性:
 *   - InstanceChargePrepaid 不支持包年包月模式
 *   - Placement
 *   - InstanceCount  不支持实例数量参数， 简化为只创建1个实例
 *   - LaunchTemplate
 *   - DisasterRecoverGroupIds
 *   - HpcClusterId
 *   - DedicatedClusterId
 *   - ChcIds
 *
 **/
export interface CvmInstanceSpec extends Omit<RunInstancesRequest, 'InstanceChargePrepaid' | 'Placement' | 'InstanceCount' | 'LaunchTemplate' | 'DisasterRecoverGroupIds' | 'HpcClusterId' | 'DedicatedClusterId' | 'ChcIds'> {
  // todo temp waiting to remove
  Region: string;

}

export interface CvmInstanceState extends Instance {
  Region: string;
}

/**
 */
export class CvmInstanceService extends TaggableResourceService<CvmInstanceSpec, CvmInstanceState> {
  readonly resourceType = TencentCloudType.cvm_instance;

  constructor(readonly project: Project, readonly clients: CvmClients) {
    super();
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.clients.getClient(region);
    const response = await client.DescribeInstances({
      InstanceIds: resourceIds,
      Limit: limit,
    });
    return (response.InstanceSet || []).map(this._toResourceInstanceFunc(region))
  }

  async create(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>> {
    const client = this.clients.getClient(config.spec.Region);

    const response = await client.RunInstances({
      ...config.spec,
      TagSpecification: [...(config.spec.TagSpecification ?? []),
        {
          ResourceType: "instance", Tags: [
            {Key: SpiConstants.tagNames.project, Value: this.project.name},
            {Key: SpiConstants.tagNames.resource, Value: config.name},
          ]
        },
      ],
    });
    if (!response.InstanceIdSet || response.InstanceIdSet.length == 0) {
      throw new Error("创建 cvm instance 失败，RunInstances 未返回 InstanceIdSet");
    }
    if (response.InstanceIdSet.length != 1) {
      throw new Error(`内部bug: 我们禁止了InstanceCount的设置，理论上一次只能创建单台cvm instance,而现在是多台:${JSON.stringify(response.InstanceIdSet)} `);
    }
    const resourceId = response.InstanceIdSet[0];
    console.log(`cvm instance 创建成功，ID: ${resourceId}`);


    const describeResponse = await client.DescribeInstances({
      InstanceIds: [resourceId],
    })
    if (!describeResponse.InstanceSet || describeResponse.InstanceSet.length == 0) {
      throw new Error("创建 cvm instance 失败，DescribeInstances 未返回 InstanceSet");
    }

    return this._toResourceInstanceFunc(config.spec.Region)(describeResponse.InstanceSet[0]);
  }

  async delete(...resources: ResourceInstance<CvmInstanceState>[]): Promise<void> {
    // 单台删除，别怕慢，就怕乱
    for (const r of resources) {
      const state = r.state;
      const client = this.clients.getClient(state.Region);
      console.log(`cvm instance 删除准备，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
      await client.TerminateInstances({InstanceIds: [state.InstanceId!]})
      console.log(`cvm instance 删除成功，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
    }
  }

  async load(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.clients.getClient(config.spec.Region);
    const response = await client.DescribeInstances({
      // 按标签过滤
      Filters: [
        {Name: `tag:${(SpiConstants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(SpiConstants.tagNames.resource)}`, Values: [config.name]},
      ],
      Limit: this.resourceType.pageLimit,
    });
    return (response.InstanceSet || []).map(this._toResourceInstanceFunc(config.spec.Region));
  }

  private _toResourceInstanceFunc(region: string): (e: Instance) => ResourceInstance<CvmInstanceState> {
    return (e: Instance) => {
      const resourceName = (e.Tags ?? []).find(tag => tag.Key === SpiConstants.tagNames.resource)?.Value;
      return new ResourceInstance(this, resourceName || "", {
        ...e,
        Region: region,
      });
    };
  }

}