import {ClientConfig, Credential as tc_Credential} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Client as TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {ResourceTag} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_models.js";
import {
    Constants,
    StatePart,
    Project,
    Provider,
    ResourceService
} from "@qpa/core";//@qpa/core
import * as common from "@/internal/common.ts";

export abstract class TencentCloudResourceService<SPEC,STATE> extends ResourceService<SPEC,STATE>{

}

export interface TencentCloudCredential extends tc_Credential {
}

/**
 * 支持tag的资源 Taggable
 */
export abstract class TaggableResourceService<SPEC,STATE> extends TencentCloudResourceService<SPEC,STATE> {
    abstract loadByTags(resourceTags: ResourceTag[]): Promise<StatePart<STATE>[]>;
}

/**
 * serviceType&resourcePrefix 是tag api 的术语，也是腾讯云资源urn的术语
 * [支持标签 API 的资源类型](https://cloud.tencent.com/document/product/651/89122)
 *
 * 不可变类型.
 *
 * 资源六段式列表。腾讯云使用资源六段式描述一个资源。
 * 例如：ResourceList.1 = qcs::{ServiceType}:{Region}:{Account}:{ResourcePreifx}/${ResourceId}。
 */
export class ResourceType {
    private static _types = new Array<ResourceType>();

    // 私有构造函数，防止外部直接 new
    private constructor(
        public readonly serviceType: string,
        public readonly resourcePrefix: string,
        // public readonly createService: (provider: TencentCloudProvider) => TencentCloudTaggedResourceService,
    ) {
    }

    // 静态工厂方法创建实例
    static of(props: {
        serviceType: string;
        resourcePrefix: string;
    }): ResourceType {
        // 更严格的类型检查
        if (!props || typeof props !== 'object') {
            throw new Error('Props must be an object');
        }

        if (props.serviceType && props.serviceType.trim() === '') {
            throw new Error('ServiceType must be a non-empty string');
        }

        if (props.resourcePrefix && props.resourcePrefix.trim() === '') {
            throw new Error('ResourcePrefix must be a non-empty string');
        }
        //
        // if (typeof props.createService !== 'function') {
        //     throw new Error('CreateService must be a function');
        // }

        const result = new ResourceType(props.serviceType, props.resourcePrefix);
        const key = result.toString();
        const found = ResourceType._types.find(e => e.toString() === key);
        if (found) {
            return found;
        }
        ResourceType._types.push(result);
        return result;
    }

    static get types(): ReadonlyArray<ResourceType> {
        ResourceType.checkInit();
        return ResourceType._types;
    }

    private static checkInit() {
        if (ResourceType._types.length === 0) {
            throw Error("ResourceType not init")
        }
    }

    // 获取唯一标识符
    toString(): string {
        return `${this.serviceType}:${this.resourcePrefix}`;
    }

    static find(serviceType?: string, resourcePrefix?: string): ResourceType | undefined {
        ResourceType.checkInit();
        return ResourceType._types.find(e => e.serviceType === serviceType && e.resourcePrefix === resourcePrefix);
    }
}

export interface TencentCloudProviderProps {
    readonly credential: TencentCloudCredential;
    allowedResourceServices: (provider: TencentCloudProvider) => Map<ResourceType, TencentCloudResourceService<unknown,unknown>>;
}

export class TencentCloudProvider extends Provider {
    private readonly _resourceServices: Map<ResourceType, TencentCloudResourceService<unknown,unknown>>;
    private tagClient!: TagClient;
    public credential!: TencentCloudCredential;

    constructor(readonly project: Project, readonly props: TencentCloudProviderProps) {
        super(project);

        this.credential = props.credential;

        this._resourceServices = props.allowedResourceServices(this);
        if (this._resourceServices.size === 0) {
            throw Error("请提供您项目所要支持的资源服务列表，目前您支持的资源服务列表为空")
        }
    }

    _getService(type: ResourceType): TencentCloudResourceService<unknown,unknown> {
        const result = this._resourceServices.get(type);
        if (!result) throw Error(`resource service[${type}] not found, 请给出需要支持的资源，或禁用此资源类型`);
        return result;
    }

    async loadAll(): Promise<StatePart<unknown>[]> {
        const projectName=this.project.name;
        const gen = common.queryPage(async (offset) => {
            const limit = 100;
            const resp = await this._getTagClient().DescribeResourcesByTags({
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

        const result = new Array<StatePart<unknown>>();
        for (const [resourceType, tagResources] of type_tags) {
            const resourceService = this._resourceServices.get(resourceType);
            if (!resourceService) {
                // 不支持类型应该异常退出吗？
                // 不支持类型可能是以前框架支持某种类型时创建的，但当前版本不再支持
                console.error(`not support resourceType: ${resourceType} - ${tagResources}`);
                continue;
            }

            if (resourceService instanceof TaggableResourceService) {
                const resources = await resourceService.loadByTags(tagResources);
                result.push(...resources);
            } else {
                // tag查询的结果即然存在，说明此资源是支持tag，但当前服务类型又不是tagged的，说明版本不对，新版的代码创建了资源，又用旧版的去管理
                throw Error(`resourceType:${resourceType} not support tag, may be your current version too old, upgrade and try`)
            }

        }
        return result;
    }

    public _getClientConfigByRegion(region: string): ClientConfig {
        return {
            credential: this.credential,
            region: region,
        }
    }


    _getTagClient(): TagClient {
        if (!this.tagClient) {
            this.tagClient = new TagClient({
                credential: this.credential,
            });
        }
        return this.tagClient;
    }

}

