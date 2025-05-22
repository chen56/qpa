// packages/app-frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // 默认情况下，Vitest会在其config文件所在的目录查找测试文件
        // 所以，你可能不需要显式设置 include 或 exclude，除非你有特殊路径
        include: ['test/**/*.spec.ts', 'test/**/*.test.ts'], // 明确指定要包含的测试文件
        exclude: ['node_modules', 'dist', '**/node_modules/**', '**/dist/**'], // 排除通常的构建和依赖目录
        // 如果需要，可以在这里配置环境、模拟等
        // environment: 'jsdom',
        globals: true,
    },
});