/// <reference types="vitest/config" />

// Configure Vitest (https://vitest.dev/config/)

import {defineConfig} from "vite";

export default defineConfig({
    plugins: [
        // Vite（以及 Vitest，因为它基于 Vite）在进行模块解析时，默认情况下不会读取和应用 tsconfig.json 中的 paths 映射。
        // 比如vitest
        //     不支持：import {xxx} from "@/_common.ts";
        //     只支持：import {xxx} from "../src/_common.ts";
        // 起因是Vite 在开发服务器或测试环境中加载模块时有自己的解析逻辑。
        // 而tsconfigPaths插件告诉 Vite 除了标准的 Node.js 模块解析规则外，还要参考 tsconfig.json 的 paths 映射
        // tsconfigPaths(),
    ],
    resolve: {
        alias: {
            // 将 "@/" 映射到当前文件所在目录下的 "src" 目录
            // '@/': path.resolve(__dirname, './src/'),
            // 注意：这里的路径是相对于 vite.config.ts 文件所在的目录解析的
            // path.resolve(__dirname, './src/') 会解析到 /Users/chen/git/chen56/qpa/packages/provider-tencentcloud/src/
        },
    },
    test: {
        alias: {
            // 放弃和'@/'的战斗，nodejs工具链真的是太搞了
            // '@/': './src/', // [!code --]
            '@/': new URL('./src/', import.meta.url).pathname, // [!code ++]
        },
        /* for example, use global to avoid globals imports (describe, test, expect): */
        globals: true,
    },
})