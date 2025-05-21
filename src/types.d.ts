// 扩展 ImportMeta 接口，添加 customConfig 属性
// 使用import.meta.url时需要配置，以使ide不报错
declare global {
    interface ImportMeta {
        customConfig: {
            apiUrl: string;
            debugMode: boolean;
        };
    }
}

// 确保该文件被视为模块
export {};