import {RunInstancesRequest, Instance} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models.js";
import {Project, ResourceConfig, ResourceInstance} from "@qpa/core";
import {_Runners, _TaggableResourceService, _TencentCloudProvider, TencentCloudType} from "../provider.ts";
import {CvmFactory} from "./factory.ts";
import {SpiConstants} from "@qpa/core/spi";


/**
 *
 *  CVM实例
 *  ref: <https://github.com/tencentcloudstack/terraform-provider-tencentcloud/blob/master/tencentcloud/services/cvm/resource_tc_instance.go>
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

  /**
   *  实例计费类型(目前只支持):
   *   POSTPAID_BY_HOUR：按小时后付费
   *   SPOTPAID：竞价付费
   *   默认值：POSTPAID_BY_HOUR。
   */
  InstanceChargeType: "SPOTPAID" | "POSTPAID_BY_HOUR";

}

export interface CvmInstanceState extends Instance {
  Region: string;
}

/**
 */
export class CvmInstanceService extends _TaggableResourceService<CvmInstanceSpec, CvmInstanceState> {
  readonly resourceType = TencentCloudType.cvm_instance;
  private readonly provider: _TencentCloudProvider;
  private runners: _Runners;

  constructor(readonly project: Project, readonly cvm: CvmFactory) {
    super();
    this.provider=cvm.provider;
    this.runners=cvm.provider.runners;
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.cvm.getClient(region);
    const response = await client.DescribeInstances({
      InstanceIds: resourceIds,
      Limit: limit,
    });
    return (response.InstanceSet || []).map(this._toResourceInstanceFunc(region))
  }

  async create(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>> {
    if( !["POSTPAID_BY_HOUR","SPOTPAID"].includes(config.spec.InstanceChargeType)){
        throw new Error(`实例计费类型(InstanceChargeType)只支持: POSTPAID_BY_HOUR, SPOTPAID`);
    }

    const client = this.cvm.getClient(config.spec.Region);

    // 分离出扩展的参数，不然腾讯云api会报错
    const {Region, ...runInstancesRequest} = config.spec;

    const response = await client.RunInstances({
      ...runInstancesRequest,
      TagSpecification: [
        // 先复制客户定义的标签
        ...(config.spec.TagSpecification ?? []),
        //再附带上项目标签和资源标签
        {
          ResourceType: "instance", Tags: [
            {Key: SpiConstants.tagNames.project, Value: this.project.name},
            {Key: SpiConstants.tagNames.resource, Value: config.name},
          ]
        },
      ],
      // InstanceCount 应该始终为 1，因为 QPA 框架简化为只创建单个实例
      InstanceCount: 1, // 确保明确设置为1
    });
    if (!response.InstanceIdSet || response.InstanceIdSet.length == 0) {
      throw new Error("创建 cvm instance 失败，RunInstances 未返回 InstanceIdSet");
    }
    if (response.InstanceIdSet.length != 1) {
      throw new Error(`内部bug: 我们禁止了InstanceCount的设置，理论上一次只能创建单台cvm instance,而现在是多台:${JSON.stringify(response.InstanceIdSet)} `);
    }
    const resourceId = response.InstanceIdSet[0];
    console.log(`cvm instance 创建成功，ID: ${resourceId}`);


    // 5. 调用 DescribeInstances 获取完整实例状态（Terraform 模式）
    const describeResponse = await client.DescribeInstances({
      InstanceIds: [resourceId],
    })
    if (!describeResponse.InstanceSet || describeResponse.InstanceSet.length == 0) {
      throw new Error("创建 cvm instance 失败，DescribeInstances 未返回 InstanceSet");
    }


    // 当前未实现对tags的 waiting, 暂时忽略
    // Wait for the tags attached to the vm since tags attachment it's async while vm creation.


    return this._toResourceInstanceFunc(config.spec.Region)(describeResponse.InstanceSet[0]);
  }

  async delete(...resources: ResourceInstance<CvmInstanceState>[]): Promise<void> {
    // 单台删除，别怕慢，就怕乱
    for (const r of resources) {
      const state = r.state;
      const cvmClient = this.cvm.getClient(state.Region);
      console.log(`cvm instance 删除准备，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
      await cvmClient.TerminateInstances({InstanceIds: [state.InstanceId!]})

      // 创建重试策略
      const waitingDeleteComplete = this.runners.removeResourceWaiting();

      await waitingDeleteComplete.execute(async (context) => {
        console.log(`waiting delete complete，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`, context);

        const describeInstancesResponse = await cvmClient.DescribeInstances({
          // 按标签过滤
          Filters: [
            {Name: `instance-id`, Values: [r.state.InstanceId!]},
          ],
          Limit: this.resourceType.queryLimit,
        });

        if (!describeInstancesResponse.InstanceSet || describeInstancesResponse.InstanceSet!.length == 0) {
          return;
        }else{
          throw new Error(`实例${r.state.InstanceId}还未删除干净，继续等待`);
        }
      });
      await waitingDeleteComplete.execute(async (context) => {
        console.log(`waiting delete complete，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`, context);

        const describeInstancesResponse = await cvmClient.DescribeInstances({
          // 按标签过滤
          Filters: [
            {Name: `instance-id`, Values: [r.state.InstanceId!]},
          ],
          Limit: this.resourceType.queryLimit,
        });

        if (!describeInstancesResponse.InstanceSet || describeInstancesResponse.InstanceSet!.length == 0) {
          return;
        }else{
          throw new Error(`实例${r.state.InstanceId}还未删除干净，继续等待`);
        }
      });




      console.log(`cvm instance 删除成功，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
    }
  }

  async delete2(...resources: ResourceInstance<CvmInstanceState>[]): Promise<void> {
    // 单台删除，别怕慢，就怕乱
    for (const r of resources) {
      const state = r.state;
      const client = this.cvm.getClient(state.Region);
      console.log(`cvm instance 删除准备，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
      await client.TerminateInstances({InstanceIds: [state.InstanceId!]})


      const runner=this.runners.removeResourceWaiting();
      while (true) {

        await new Promise(resolve => setTimeout(resolve, 1000));
        const describeInstancesResponse = await client.DescribeInstances({
          // 按标签过滤
          Filters: [
            {Name: `instance-id`, Values: [r.state.InstanceId!]},
          ],
          Limit: this.resourceType.queryLimit,
        });
        if (!describeInstancesResponse.InstanceSet || describeInstancesResponse.InstanceSet!.length == 0) {
          break;
        }
        const i = describeInstancesResponse.InstanceSet![0];
        console.log(`deleting，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`, i);
      }
      console.log(`cvm instance 删除成功，qpaName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
    }
  }

  async load(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.cvm.getClient(config.spec.Region);
    const response = await client.DescribeInstances({
      // 按标签过滤
      Filters: [
        {Name: `tag:${(SpiConstants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(SpiConstants.tagNames.resource)}`, Values: [config.name]},
      ],
      Limit: this.resourceType.queryLimit,
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