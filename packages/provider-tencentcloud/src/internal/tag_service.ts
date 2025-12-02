import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {ResourceTag, TagFilter} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {Project, ResourceInstance, ResourceService, ResourceType} from "@qpa/core";
import {Arrays, Paging} from "./common.ts";
import {TencentCloudResourceType, _TaggableResourceService, _ClientWarp, _TencentCloudContext, _Runners} from "../provider.ts";
import {Constants} from "@qpa/core";
import {TencentCloudConfig} from "@qpa/provider-tencentcloud";

const __PAGE_LIMIT = 100;


/**
 * **重要**，由于腾讯云不保证TAG和资源的一致性，所以用Tag查询资源会有找不到(延迟)，
 * 导致destroy时漏掉资源,所以我们只能用这种列表的方式罗列遍历查询，如不提供，则会查询所有类型.
 * TODO : tag不可靠，和资源的创建是分离的，1.还要等待，2.中途报错会不一致之类的情况发生，是否直接每个资源类型去分别查询比较靠谱，因为咱管理的本身资源类型就限定的很少？
 */
export class _TagClientWarp extends _ClientWarp {
  private readonly tagClient: tc_TagClient;

  constructor(private readonly tcContext: _TencentCloudContext,
              config: TencentCloudConfig) {
    super(config);
    this.tagClient = new tc_TagClient({
      credential: config.credential,
    });
  }

  get project(): Project {
    return this.tcContext.project;
  }

  get runners(): _Runners {
    return this.tcContext.runners;
  }

  getClient(): tc_TagClient {
    return this.tagClient;
  }

  async findResourceInstances(resourceServices: ReadonlyMap<ResourceType, ResourceService<unknown, unknown>>): Promise<ResourceInstance<unknown>[]> {
    const projectName = this.project.name;
    const tagList = await Paging.list<ResourceTag>(async (offset) => {

      const response = await this.tagClient.DescribeResourcesByTags({
        TagFilters: [{
          TagKey: Constants.tagNames.project,
          TagValue: [projectName]
        }],
        Limit: __PAGE_LIMIT, // 分页大小
        Offset: offset,
      });

      return {
        totalCount: response.TotalCount,
        rows: response.Rows ?? [],
        limit: response.Limit ?? __PAGE_LIMIT,
      };
    });
    const type_resourceTags = new Map<TencentCloudResourceType, ResourceTag[]>
    for (const resourceTag of tagList) {
      if (!resourceTag.ServiceType || !resourceTag.ResourcePrefix) continue;
      const resourceType = TencentCloudResourceType.find(resourceTag.ServiceType, resourceTag.ResourcePrefix)
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
      const resourceService = resourceServices.get(resourceType);
      if (!resourceService) {
        // 不支持类型应该异常退出吗？
        // 不支持类型可能是以前框架支持某种类型时创建的，但当前版本不再支持
        console.error(`not support resourceType: ${resourceType} - ${oneTypeResourceTag}`);
        continue;
      }

      if (!(resourceService instanceof _TaggableResourceService)) {
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
        for (const onePageResourceIds of Arrays.chunk(oneRegionResourceIds, resourceType.queryLimit)) {
          const resources = await resourceService.findOnePageInstanceByResourceId(region, onePageResourceIds, resourceType.queryLimit);
          result.push(...resources);
        }
      }
    }
    return result;
  }

  async waitingTagsAttached(opts: {
    region: string;
    resourceId: string;
    resourcePrefix: string;
    serviceType: string;
    tagFilters: Array<{ TagKey: string, TagValue: string[] }>
  }) {

    const runner = this.runners.retryForCreate();

    return runner.execute(async (context) => {
      const response = await this.tagClient.DescribeResourcesByTags({
        ResourceRegion: opts.region,
        ResourceId: opts.resourceId,
        ResourcePrefix: opts.resourcePrefix,
        ServiceType: opts.serviceType,
        TagFilters: opts.tagFilters.map((t) => {
          return {TagKey: t.TagKey, TagValue: t.TagValue}
        }),
      });
      if (!response.Rows || response.Rows.length === 0) {
        throw new Error(`实例${JSON.stringify(opts)} Tag未绑定，继续等待`);
      }
      const resourceTag = response.Rows[0];

      // 检查所有预期的标签是否都已绑定
      for (const expectedTag of opts.tagFilters) {
        const foundTag = resourceTag.Tags?.find(
          t => t.TagKey === expectedTag.TagKey && expectedTag.TagValue.includes(t.TagValue)
        );

        if (!foundTag) {
          throw new Error(`实例${JSON.stringify(opts)} 的标签 ${expectedTag.TagKey}=${expectedTag.TagValue.join(',')} 未绑定，继续等待`);
        }
      }

      // 所有标签都已绑定，返回成功
      return resourceTag;
    });
  }

}

