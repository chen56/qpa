// /your-monorepo/packages/your-package/.eslintrc.js
module.exports = {
    root: true, // 这个 package 是它自己 linting 的“根”
    // 使用相对路径继承 Monorepo 根目录的配置
    extends: [
        '../../.eslintrc.js', // 假设根配置在 Monorepo 根目录
        // 可以在继承根配置的基础上，再继承其他特定于这个 package 的配置
        // 例如：'plugin:react/recommended', // 如果这是个 React 包
        // 'plugin:@typescript-eslint/recommended', // 如果这是个 TypeScript 包
    ],
    env: {
        es6: true,
        // 定义这个 package 的环境，可能会覆盖根中的 env
        node: false,
    },
    rules: {
        // 在这里定义或覆盖只适用于这个 package 的规则
        // 例如：覆盖根中的 indent 规则
        // 'indent': ['warn', 4],
        // 例如：添加 React 特有规则的配置
        // 'react/jsx-uses-react': 'error',
        // ...
    },
    // 如果这个 package 内有需要特殊配置的子目录或文件，可以在这里使用 overrides
    // overrides: [...]
};