import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {Project, ResourceInstance} from "@qpa/core";
import {Arrays, Paging} from "./_common.ts";
import {TencentCloudType, TaggableResourceService, _TencentCloudAware} from "../provider.ts";
import {SpiConstants} from "@qpa/core/spi";

const pageLimit = 100;

/**
 * 非资源性
 */
export class TagService {

  constructor(private readonly project: Project, readonly tc: _TencentCloudAware) {
  }

  get tagClient(): tc_TagClient {
    return this.tc.tagClient;
  }

  async findResourceInstances(): Promise<ResourceInstance<unknown>[]> {
    const projectName = this.project.name;
    const tagList = await Paging.list<ResourceTag>(async (offset) => {

      const response = await this.tagClient.DescribeResourcesByTags({
        TagFilters: [{
          TagKey: SpiConstants.tagNames.project,
          TagValue: [projectName]
        }],
        Limit: pageLimit, // 分页大小
        Offset: offset,
      });

      return {
        totalCount: response.TotalCount,
        rows: response.Rows ?? [],
        limit: response.Limit ?? pageLimit,
      };
    });
    const type_resourceTags = new Map<TencentCloudType, ResourceTag[]>
    for (const resourceTag of tagList) {
      if (!resourceTag.ServiceType || !resourceTag.ResourcePrefix) continue;
      const resourceType = TencentCloudType.find(resourceTag.ServiceType, resourceTag.ResourcePrefix)
      if (!resourceType) continue;

      let oneTypeResourceTags = type_resourceTags.get(resourceType);
      if (!oneTypeResourceTags) {
        oneTypeResourceTags = new Array<ResourceTag>();
        type_resourceTags.set(resourceType, oneTypeResourceTags);
      }
      oneTypeResourceTags.push(resourceTag);
    }

    const result = new Array<ResourceInstance<unknown>>();
    for (const [resourceType, oneTypeResourceTag] of type_resourceTags) {
      const resourceService = this.tc._services.get(resourceType);
      if (!resourceService) {
        // 不支持类型应该异常退出吗？
        // 不支持类型可能是以前框架支持某种类型时创建的，但当前版本不再支持
        console.error(`not support resourceType: ${resourceType} - ${oneTypeResourceTag}`);
        continue;
      }

      if (!(resourceService instanceof TaggableResourceService)) {
        throw Error(`resourceType:${resourceType} not support tag, may be your current version too old, upgrade and try`)
      }
      const region_resourceTags = new Map<string, string[]>;

      for (const resourceTag of oneTypeResourceTag) {
        const region = resourceTag.ResourceRegion || "";
        let tags = region_resourceTags.get(region);
        if (!tags) {
          tags = new Array<string>();
          region_resourceTags.set(region, tags);
        }
        if (resourceTag.ResourceId) {
          tags.push(resourceTag.ResourceId!);
        }
      }
      for (const [region, oneRegionResourceIds] of region_resourceTags) {
        // 切片为多页查询
        for (const pageIds of Arrays.chunk(oneRegionResourceIds, resourceType.pageLimit)) {
          const resources = await resourceService.findOnePageInstanceByResourceId(region, pageIds, resourceType.pageLimit);
          result.push(...resources);
        }
      }
    }
    return result;
  }
}

