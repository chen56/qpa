// ..eslintrc.ts
import type { ESLint } from 'eslint'; // Optional: Import ESLint type for better type checking

const config: ESLint.ConfigData = { // Optional: Add type annotation for the config object
    root: true, // 这是 Monorepo 配置的根

    // 指定解析器为 @typescript-eslint/parser，以便 ESLint 能够理解 TypeScript 语法
    parser: '@typescript-eslint/parser',
    // 指定解析器选项
    parserOptions: {
        // 指定 ECMAScript 版本
        ecmaVersion: 2020,
        // 指定源码类型为 module
        sourceType: 'module',
        // 指定 tsconfig.json 文件，以便 ESLint 能够进行类型检查相关的规则
        // 确保这里的路径指向你的 tsconfig.json 文件
        project: './tsconfig.json',
    },
    // 扩展 ESLint 规则集
    extends: [
        // 使用 ESLint 的推荐规则
        'eslint:recommended',
        // 使用 @typescript-eslint/eslint-plugin 的推荐规则
        'plugin:@typescript-eslint/recommended',
        // 如果需要，可以使用更严格的规则集
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    // 定义自定义规则
    rules: {
        // 强制使用显式成员可访问性修饰符 (public, private, protected)
        // 这有助于明确成员的预期可见性
        '@typescript-eslint/explicit-member-accessibility': [
            'error', // 或 'warn' 如果只是警告
            {
                accessibility: 'explicit', // 要求所有成员都必须有明确的修饰符
                // 可以根据需要配置例外，例如构造器可以不需要
                // overrides: {
                //     constructors: 'no-public', // 构造器不需要 public 修饰符
                // }
            },
        ],

        // 其他你可能想要的 TypeScript 规则，例如：
        // '@typescript-eslint/no-unused-vars': 'warn', // 警告未使用的变量
        // '@typescript-eslint/no-explicit-any': 'warn', // 警告使用 any
        // '@typescript-eslint/no-inferrable-types': 'off', // 关闭对可推断类型的显式类型注解警告
    },
    // 指定要忽略的文件或目录
    ignorePatterns: [
        'dist/', // 忽略编译输出目录
        'node_modules/', // 忽略依赖目录
        '.vite/', // 忽略 Vite 缓存目录
        // ... 其他需要忽略的文件或目录
    ],
};

// 使用 TypeScript/ESM 语法导出配置对象
export default config;
