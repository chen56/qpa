/**
 * SPI接口
 *
 * Provider的实现类不应该暴露给api客户程序，客户程序应通过@qpa/core的Project使用资源管理功能
 *
 * @return 获取查询出ResourceScope内的所有的资源状态
 */
import {Resource_, ResourceConfig, ResourceInstance, ResourceType} from "./core.ts";
import * as common from "./internal/_common.ts";


/**
 * @internal
 *
 *
 * 无状态服务提供者, 状态由每个Provider对应的 Vendor 维护
 *
 * todo 既然已经拆分Vendor,为啥不直接用接口呢？
 */
export abstract class Provider {

    protected constructor() {
    }

    readonly resourceServices = new ResourceServices();

    /**
     * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
     *
     * 查询最新的 ResourceScope 内的所有的已存在资源的状态信息
     *
     * @return 获取查询出ResourceScope内的所有的资源状态
     */
    abstract findResourceInstances(): Promise<ResourceInstance<unknown>[]>;
}

/**
 * SPI 接口，并不直接暴露给api客户程序。
 *
 *
 * 实现Provider的公共逻辑有2种方式：
 * 1. 使用继承：用父类型实现对资源的管理公共逻辑
 * 2. 使用隔离的组合composite模型
 *
 * Vendor的逻辑原先用继承实现，由Provider父类型提供公共逻辑，我们拆离为组合模式，这样SPI实现者只关注Provider的接口实现即可
 * 避免SPI客户面对Vendor和云实现无关的接口，减少信息过载
 */
export class Vendor {
    /**
     * @internal
     * */
    private _resourceInstances: __ResourceInstances = new __ResourceInstances();

    /**
     * @internal
     * */
    _resources: __Resources = new __Resources();
    private sortedResourceTypesCache!: ResourceType[];

    private constructor(private readonly provider: Provider) {

    }

    get resourceServices() {
        return this.provider.resourceServices;
    };

    get resourceInstances(): ReadonlyArray<ResourceInstance<unknown>> {
        return this._resourceInstances;
    }

    /**
     * @internal
     */
    static _create(provider: Provider) {
        return new Vendor(provider);
    }

    private get sortedResourceTypes(): ResourceType[] {
        // init
        if (!this.sortedResourceTypesCache) {
            const resourceTypeDependencies = new Map<ResourceType, ResourceType[]>();
            for (const [type, _] of this.resourceServices) {
                resourceTypeDependencies.set(type, type.dependencies);
            }
            this.sortedResourceTypesCache = common.topologicalSortDFS(resourceTypeDependencies);
        }

        return this.sortedResourceTypesCache;
    }

    /**
     * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
     **/
    async refresh(): Promise<void> {
        this._resourceInstances = new __ResourceInstances(...await this.provider.findResourceInstances());
    }

    /**
     * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
     *
     * 因为清理方法是up的最后一步，此方法必须在外部调用完up后才能使用。
     *
     * 清理待删除资源(Pending Deletion Instances)
     * 服务提供者Provider应确保此方法内部先获取最新的实际资源实例，再删除所有Pending Deletion Instances
     * 不应期待外部调用者获取最新状态
     * */
    async cleanup(): Promise<void> {
        await this.refresh();

        const undeclaredResourcePendingToDelete = this._resourceInstances.filter(e => {
            const declared = this._resources.get(e.name);
            return !declared;
        });
        return this.removeResourceInstances(undeclaredResourcePendingToDelete);
    }

    /**
     * SPI方法，不应被客户程序直接调用，客户程序应通过@qpa/core的Project使用
     *
     * 销毁所有实际存在的资源实例
     * */
    async destroy(): Promise<void> {
        await this.refresh();
        const safeCopy = this._resourceInstances.slice()
        await this.removeResourceInstances(safeCopy);
        // todo 这里是否应该每删除一个instance就删除一个相应的resource: this._resources.delete(instance.name)?
        this._resources.clear();
    }

    private async removeResourceInstances(instances: ResourceInstance<unknown>[]) {
        // 1. 获取所有待删除实例涉及的资源类型
        const uniqueResourceTypesToDelete = new Set<ResourceType>(instances.map(e => e.resourceType));

        // 2. 过滤出只包含待删除实例类型的排序结果，并且是反向排序（先删除依赖者，后删除被依赖者）
        // 因为拓扑排序的结果是：被依赖者在前，依赖者在后。
        // 而删除顺序需要：依赖者在前，被依赖者在后。
        // 所以需要反转 sortedGlobalTypes，并过滤出要删除的类型。
        const deletionOrderTypes = this.sortedResourceTypes
            .filter(type => uniqueResourceTypesToDelete.has(type));

        // 3. 按类型顺序逐批删除资源
        for (const typeToDestroy of deletionOrderTypes) {
            const instancesOfType = instances.filter(res => res.resourceType === typeToDestroy);

            console.log(`--- 正在删除 ${typeToDestroy} 类型的资源 ${instancesOfType.length} 个 ---`);
            for (const instance of instancesOfType) {
                console.log(`正在删除实例: ${instance.name} (类型: ${instance.resourceType})`);

                // real delete
                await instance.destroy();
                this._resourceInstances.delete(instance);

                console.log(`实例 ${instance.name} (类型: ${instance.resourceType}) 删除完成。`);
            }
        }
        console.log('所有指定资源删除完成。');
    }


    /**
     * 声明资源(Declared Resources)上线，以便提供服务
     */
    async up<TSpec, TState>(resourceType: ResourceType, expected: ResourceConfig<TSpec>): Promise<Resource_<TSpec, TState>> {
        const service = this.provider.resourceServices.get(resourceType) as ResourceService<TSpec, TState>;

        let actual = await service.load(expected);
        // todo 已存在的应该删除？
        if (actual.length == 0) {
            actual = [await service.create(expected)];
        }
        if (actual.length === 0) {
            throw new Error(`bug: 应该不会发生, 可能是QPA的bug, 资源${expected.name}的实际资源实例数量应该不为0, 但是目前为0 `)
        }

        if (actual.length > 1) {
            throw new Error(`名为(${expected.name})的资源, 发现重复/冲突资源实例(Duplicate/Conflicting Resources): 可能是重复创建等故障导致同名冲突实例，需要您手工清除或执行destroy后up重建,冲突实例：${actual.map(e => e.toJson())}`)
        }

        const result = new Resource_(expected, actual);
        this._resources.set(result.name, result);
        this._resourceInstances.push(...actual);
        return result;
    }
}


export abstract class ResourceService<SPEC, STATE> {
    abstract get resourceType(): ResourceType;

    abstract create(config: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>>;

    abstract delete(...instances: ResourceInstance<STATE>[]): Promise<void>;

    /**
     * @return 可能返回多个实际的同名云资源，因为一个资源可能被非正常的多次创建，重复问题留给上层程序判断解决
     */
    abstract load(config: ResourceConfig<SPEC>): Promise<ResourceInstance<STATE>[]> ;
}


/**
 * @internal
 */
class __Resources extends Map<string, Resource_<unknown, unknown>> {
    constructor(...args: [string, Resource_<unknown, unknown>][]) {
        super(args);
        //typescript原型链修复
        Object.setPrototypeOf(this, __Resources.prototype);

    }
}

/**
 * @internal
 */
class __ResourceInstances extends Array<ResourceInstance<unknown>> {
    constructor(...args: ResourceInstance<unknown>[]) {
        super(...args); // 调用 Array(...items: T[]) 构造形式
        //typescript原型链修复
        Object.setPrototypeOf(this, __ResourceInstances.prototype);
    }

    delete(instance: ResourceInstance<unknown>) {
        const index = this.indexOf(instance); // 查找 'banana' 的索引
        if (index !== -1) {
            this.splice(index, 1); // 删除该元素
        }
    }
}


class ResourceServices extends Map<ResourceType, ResourceService<unknown, unknown>> {
    constructor(...args: [ResourceType, ResourceService<unknown, unknown>][]) {
        super(args);
        // 确保原型链正确
        Object.setPrototypeOf(this, ResourceServices.prototype);
    }

    register(service: ResourceService<unknown, unknown>) {
        const type = service.resourceType;
        if (this.has(type)) {
            throw Error(`resource service[${type}] already registered`);
        }
        this.set(type, service);
    }
}
