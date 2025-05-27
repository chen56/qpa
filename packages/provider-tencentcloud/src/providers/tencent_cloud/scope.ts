import {Client as TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {Constants, ResourceInstance} from "@qpa/core";
import {Paging} from "../../internal/common.ts";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {TencentCloudProvider} from "@qpa/provider-tencentcloud";
import {ResourceType, TaggableResourceService} from "./provider.ts";

export interface BaseResourceScopeProps{
  /**
   * 强制所有继承者都必须有 'type' 字段
   * 在这里定义为 'string'，表示它必须存在且是字符串
   */
  type: string
}

/**
 * 基于tag 来圈定一个项目管理资源的范围，为每个创建的资源打上tag： projectName
 *
 * @public
 */
export interface TagBaseResourceScopeProps extends BaseResourceScopeProps{
  type: 'TagBaseResourceScope';
  scopeName: string;

}

/**
 * 实验性质，还未实现
 *
 * @alpha
 */
export interface ProjectBaseResourceScopeProps extends BaseResourceScopeProps{
  type: 'ProjectBaseResourceScope';
  projectName: string;

}

export type ScopeProps = TagBaseResourceScopeProps | ProjectBaseResourceScopeProps;



/**
 * @internal
 */
export abstract class TencentCloudResourceScope {
  name: string;

  protected constructor(props: { name: string; }) {
    this.name = props.name;
  }

  abstract findActualResourceStates(): Promise<ResourceInstance<unknown>[]> ;

  static of(provider: TencentCloudProvider, props: ScopeProps) {
// 使用 switch 语句对可辨识联合类型进行类型缩小
    switch (props.type) {
      case 'TagBaseResourceScope':
        return new agBaseResourceScope(provider, props);
      case 'ProjectBaseResourceScope':
        return new ProjectBaseResourceScope(provider, props);
      default:
        // 这是 TypeScript 的 exhaustiveness checking。
        // 如果 ScopeProps 联合类型增加了新的 'type' 值，
        // 但这里没有对应的 case 来处理，TypeScript 会在这里报错。
        let _exhaustiveCheck: never;
        _exhaustiveCheck = props;
        throw new Error(`Unknown scope type: ${(_exhaustiveCheck as any).type}, props:${props}`);
    }
  }
}


export class agBaseResourceScope extends TencentCloudResourceScope {
  private tagClient: TagClient;

  constructor(readonly provider: TencentCloudProvider, props: TagBaseResourceScopeProps) {
    super({name: props.scopeName});
    this.tagClient = new TagClient({
      credential: provider.credential,
    });

  }

  async findActualResourceStates(): Promise<ResourceInstance<unknown>[]> {
    //todo scope base filter
    const projectName = this.name;
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

export class ProjectBaseResourceScope extends TencentCloudResourceScope {
  constructor(readonly provider: TencentCloudProvider, props: ProjectBaseResourceScopeProps) {
    super({name: props.projectName});
    throw new Error("Not impl")
  }

  async findActualResourceStates(): Promise<ResourceInstance<unknown>[]> {
    throw new Error("Not impl")
  }
}
