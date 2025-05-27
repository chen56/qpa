import {Client as TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {Constants, ResourceInstance} from "@qpa/core";
import {Paging} from "../../internal/common.ts";
import {ResourceType, TaggableResourceService, TencentCloudProvider} from "./provider.ts";

export class TagService {
  private tagClient: TagClient;

  constructor(readonly provider: TencentCloudProvider) {
    this.tagClient = new TagClient({
      credential: provider.credential,
    });

  }

  async findActualResourceStates(): Promise<ResourceInstance<unknown>[]> {
    const projectName = this.provider.project.name;
    const gen = Paging.queryPage<ResourceTag>(async (offset) => {
      const limit = 100;
      const resp = await this.tagClient.DescribeResourcesByTags({
        TagFilters: [{
          TagKey: Constants.tagNames.project,
          TagValue: [projectName]
        }],
        Limit: limit, // 分页大小
        Offset: offset,
      });
      return {
        totalCount: resp.TotalCount,
        rows: resp.Rows ?? [],
        limit: resp.Limit ?? limit,
      };
    });
    const type_tags = new Map<ResourceType, ResourceTag[]>
    for await(const row of gen) {
      if (!row.ServiceType || !row.ResourcePrefix) continue;
      const resourceType = ResourceType.find(row.ServiceType, row.ResourcePrefix)
      if (!resourceType) continue;

      let v = type_tags.get(resourceType);
      if (!v) {
        v = new Array<ResourceTag>();
        type_tags.set(resourceType, v);
      }
      v.push(row);
    }

    const result = new Array<ResourceInstance<unknown>>();
    for (const [resourceType, tagResources] of type_tags) {
      const resourceService = this.provider._resourceServices.get(resourceType);
      if (!resourceService) {
        // 不支持类型应该异常退出吗？
        // 不支持类型可能是以前框架支持某种类型时创建的，但当前版本不再支持
        console.error(`not support resourceType: ${resourceType} - ${tagResources}`);
        continue;
      }

      if (resourceService instanceof TaggableResourceService) {
        const resources = await resourceService.findByTags(tagResources);
        result.push(...resources);
      } else {
        // tag查询的结果即然存在，说明此资源是支持tag，但当前服务类型又不是tagged的，说明版本不对，新版的代码创建了资源，又用旧版的去管理
        throw Error(`resourceType:${resourceType} not support tag, may be your current version too old, upgrade and try`)
      }
    }
    return result;
  }
}
