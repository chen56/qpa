/**
 * IAC(Infrastructure as Code)角度看，Resource有以下几种：
 * - Configured Resources: 已配置资源, 即配置声明的资源，期望保证其存在的资源
 * - Deconfigured Resources: 已解除配置资源, 即原先被配置和声明过的资源, 但现在已从配置中删除,
 *   这些被删除的资源配置对应的真实资源也将被被清理
 * - Unmanaged Resources: 非管理资源, 即脱离IAC工具，由其他工具或手工创建的资源。
 * */

export {
    Config, LazyProject, LazyResource
} from "src/lazy.ts"

export {Provider} from "src/service.ts";
export {ResourceService} from "src/service.ts";
export {Service} from "src/service.ts";
export {RealizedResource} from "src/service.ts";
export {SpecPart} from "src/service.ts";
export {StatusPart} from "src/service.ts";
export type {ISpecPartProps} from "src/service.ts";