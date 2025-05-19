// 扩展 ImportMeta 接口，添加 customConfig 属性
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