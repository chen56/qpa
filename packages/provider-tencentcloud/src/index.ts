/**
 * 请通过此模块导入腾讯云相关API，避免直接从子文件导入。
 * 正确范例: import { VpcSpec } from 'pa/providers/tencent_cloud/vpc'
 * 错误范例: import { VpcSpec } from 'pa/providers/tencent_cloud/vpc/vpc' */
/**
 * @packageDocumentation
 * 腾讯云服务模块
 *
 * @example
 * import { TencentCloudProvider } from '@qpa/provider-tencentcloud'
 */
export * from './vpc/index.ts';

// 1. 明确列出要导出的内容（可选）
export type{TencentCloudProviderProps} from './provider.ts';
export type{TencentCloudCredential} from './provider.ts';

export {TencentCloudProvider} from './provider.ts';

// 2. 为重要的类型添加类型导出
export {LazyModeTencentCloudFactory} from './factory.ts';
export {TencentCloudFactory} from './factory.ts';
export {TencentCloud} from './factory.ts';