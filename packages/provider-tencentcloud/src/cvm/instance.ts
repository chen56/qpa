import {RunInstancesRequest, Instance} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models.js";
import {ResourceConfig, ResourceInstance} from "@planc/core";
import {_Runners, _TaggableResourceService, _TencentCloudContext, TencentCloudResourceType} from "../provider.ts";
import {Constants} from "@planc/core";
import {_CvmClientWrap} from "./client.ts";
import {_VpcClientWarp} from "../vpc/client.ts";
import {_TagClientWarp} from "../internal/tag_service.ts";


const _INSTANCE_CHARGE_TYPES = ["SPOTPAID", "POSTPAID_BY_HOUR"] as const;

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
 *   - InstanceChargePrepaid 不支持包年包月模式(因为本工具认为自动化部署只应该负责按量付费的简单模式，另外测试也难)
 *   - InstanceCount  不支持实例数量参数， 简化为每次只创建1个实例(因为每个新实例要分配标识符)
 *   - LaunchTemplate 目前不支持启动模板
 *   - DisasterRecoverGroupIds 目前不支持置放群组参数(因为难以测试)
 *   - HpcClusterId  目前不支持高性能计算集群(因为难以测试)
 *   - DedicatedClusterId  目前不支持专有集群(因为难以测试)
 *   - ChcIds  目前不支持超算集群(因为难以测试)
 **/
export interface CvmInstanceSpec extends Omit<RunInstancesRequest, 'InstanceChargePrepaid' | 'InstanceCount' | 'LaunchTemplate' | 'DisasterRecoverGroupIds' | 'HpcClusterId' | 'DedicatedClusterId' | 'ChcIds' | 'DryRun'> {
  // todo temp waiting to remove
  Region: string;

  /**
   *  实例计费类型(目前只支持):
   *   POSTPAID_BY_HOUR：按小时后付费
   *   SPOTPAID：竞价付费
   *   默认值：POSTPAID_BY_HOUR。
   */
  //等效于： InstanceChargeType: "SPOTPAID" | "POSTPAID_BY_HOUR";
  InstanceChargeType: typeof _INSTANCE_CHARGE_TYPES[number];
}

export interface CvmInstanceState extends Instance {
  Region: string;
}

/**
 */
export class _CvmInstanceService extends _TaggableResourceService<CvmInstanceSpec, CvmInstanceState> {
  readonly resourceType = TencentCloudResourceType.cvm_instance;
  private readonly runners: _Runners;

  constructor(
    tc: _TencentCloudContext,
    private readonly cvmClient: _CvmClientWrap,
    private readonly vpcClient: _VpcClientWarp,
    private readonly tagClient: _TagClientWarp) {
    super(tc);
    this.runners = tc.runners;
  }

  loadAll(): Promise<ResourceInstance<CvmInstanceState>[]> {
    throw new Error("Method not implemented.");
  }

  async findOnePageInstanceByResourceId(region: string, resourceIds: string[], limit: number): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.cvmClient.getClient(region);
    const response = await client.DescribeInstances({
      InstanceIds: resourceIds,
      Limit: limit,
    });
    return (response.InstanceSet || []).map(this._toResourceInstanceFunc(region))
  }

  async create(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>> {
    if (!_INSTANCE_CHARGE_TYPES.includes(config.spec.InstanceChargeType)) {
      throw new Error(`实例计费类型(InstanceChargeType)只支持按量付费和竞价付费: POSTPAID_BY_HOUR, SPOTPAID`);
    }

    const client = this.cvmClient.getClient(config.spec.Region);

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
            {Key: Constants.tagNames.project, Value: this.project.name},
            {Key: Constants.tagNames.resource, Value: config.name},
          ]
        },
      ],
      // InstanceCount 应该始终为 1，因为 PlanC 框架简化为只创建单个实例
      InstanceCount: 1, // 确保明确设置为1
    });
    if (!response.InstanceIdSet || response.InstanceIdSet.length < 1) {
      throw new Error("创建 cvm instance 失败，RunInstances 未返回 InstanceIdSet, 请删除后重新操作");
    }
    if (response.InstanceIdSet.length != 1) {
      throw new Error(`内部bug: 我们禁止了InstanceCount的设置，理论上一次只能创建单台cvm instance,而现在是多台:${JSON.stringify(response.InstanceIdSet)} `);
    }
    const resourceId = response.InstanceIdSet[0];
    console.log(`cvm instance 创建成功，ID: ${resourceId}`);

    const runner = this.runners.retryForCreate();
    const createdInstance = await runner.execute(async (context) => {
      // 5. 调用 DescribeInstances 获取完整实例状态（Terraform 模式）
      const describeInstancesResponse = await client.DescribeInstances({
        InstanceIds: [resourceId],
      })

      const instanceSet = describeInstancesResponse!.InstanceSet ?? [];

      if (instanceSet.length < 1) {
        throw new Error(`实例(name:${config.name}, InstanceId:${resourceId})还未创建完成，继续等待`);
      }

      const instance = instanceSet[0];

      if (instance.InstanceState == "LAUNCH_FAILED") {
        throw new Error(`实例(name:${config.name}, InstanceId:${resourceId})启动失败，请重清理后再重新创建, 失败原因:${instance.LatestOperationErrorMsg ?? "未知"}`);
      }

      if (instance.InstanceState != "RUNNING") {
        return instance;
      }

      throw new Error(`实例(name:${config.name}, InstanceId:${resourceId}, InstanceState:${instance.InstanceState})还未启动完成，继续等待`);
    });


    await this.tagClient.waitingTagsAttached({
      region: Region,
      serviceType: TencentCloudResourceType.cvm_instance.serviceType,
      resourcePrefix: TencentCloudResourceType.cvm_instance.resourcePrefix,
      resourceId: resourceId,
      tagFilters: [
        {TagKey: Constants.tagNames.project, TagValue: [this.project.name]},
        {TagKey: Constants.tagNames.resource, TagValue: [config.name]},
      ]
    });

    // todo 当前未实现对tags的 waiting
    // Wait for the tags attached to the vm since tags attachment it's async while vm creation.
    return this._toResourceInstanceFunc(config.spec.Region)(createdInstance);
  }

  async delete(resources: ResourceInstance<CvmInstanceState>[]): Promise<void> {
    // 单台删除，别怕慢，就怕乱
    for (const r of resources) {
      const state = r.state;
      const cvmClient = this.cvmClient.getClient(state.Region);
      console.log(`cvm instance 删除准备，plancName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
      await cvmClient.TerminateInstances({InstanceIds: [state.InstanceId!]})

      // 创建重试策略
      const runner = this.runners.retryForDelete();

      await runner.execute(async (context) => {
        console.log(`cvm - waiting cvm instance delete complete，plancName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`, context);

        const describeInstancesResponse = await cvmClient.DescribeInstances({
          // 按标签过滤
          Filters: [
            {Name: `instance-id`, Values: [r.state.InstanceId!]},
          ],
          Limit: this.resourceType.queryLimit,
        });

        if ((describeInstancesResponse.InstanceSet ?? []).length == 0) {
          return;
        } else {
          throw new Error(`实例${r.state.InstanceId}还未删除干净，继续等待`);
        }
      });
      await runner.execute(async (context) => {
        console.log(`vpc - waiting delete cvm complete，plancName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`, context);
        const vpcClient = this.vpcClient.getClient(state.Region);

        const response = await vpcClient.DescribeUsedIpAddress({
          VpcId: state.VirtualPrivateCloud!.VpcId!,
          SubnetId: state.VirtualPrivateCloud!.SubnetId!,
          IpAddresses: state.PrivateIpAddresses,
          Limit: TencentCloudResourceType.vpc_subnet.queryLimit,
        });

        if ((response.IpAddressStates ?? []).length == 0) {
          return;
        } else {
          throw new Error(`实例${r.state.InstanceId}还未删除干净，继续等待`);
        }
      });


      console.log(`cvm instance 删除成功，plancName:${r.name} InstanceId: ${state.InstanceId} InstanceName:${state.InstanceName}`);
    }
  }

  async load(config: ResourceConfig<CvmInstanceSpec>): Promise<ResourceInstance<CvmInstanceState>[]> {
    const client = this.cvmClient.getClient(config.spec.Region);
    const response = await client.DescribeInstances({
      // 按标签过滤
      Filters: [
        {Name: `tag:${(Constants.tagNames.project)}`, Values: [this.project.name]},
        {Name: `tag:${(Constants.tagNames.resource)}`, Values: [config.name]},
      ],
      Limit: this.resourceType.queryLimit,
    });
    return (response.InstanceSet || []).map(this._toResourceInstanceFunc(config.spec.Region));
  }

  private _toResourceInstanceFunc(region: string): (e: Instance) => ResourceInstance<CvmInstanceState> {
    return (e: Instance) => {
      const resourceName = (e.Tags ?? []).find(tag => tag.Key === Constants.tagNames.resource)?.Value;
      return new ResourceInstance(this, resourceName || "", {
        ...e,
        Region: region,
      });
    };
  }

}