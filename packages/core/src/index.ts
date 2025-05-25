/**
 * IAC(Infrastructure as Code)角度看，Resource有以下几种：
 * - Configured Resources: 已配置资源, 即配置声明的资源，期望保证其存在的资源
 * - Deconfigured Resources: 已解除配置资源, 即原先被配置和声明过的资源, 但现在已从配置中删除,
 *   这些被删除的资源配置对应的真实资源也将被被清理
 * - Unmanaged Resources: 非管理资源, 即脱离IAC工具，由其他工具或手工创建的资源。
 * */

export {Provider} from "./core.ts";
export {ResourceService} from "./core.ts";
export {Constants} from "./core.ts";
export {RealizedResource} from "./core.ts";
export {SpecPart} from "./core.ts";
export {StatusPart} from "./core.ts";
export type {ISpecPartProps} from "./core.ts";
export {Project} from "./core.ts";
export type {IResourceScope} from "./core.ts";

export {
    ConfigTodoRemove, LazyProject, LazyResource
} from "./lazy.ts"


export {EagerProject} from "./eager.ts"
export type {EagerApply} from "./eager.ts"

