// src/index.ts

import { program } from 'commander'; // 导入 Command 和 program

// 导入子命令注册函数
import { registerApplyCommand } from './commands/apply';
import { registerPlanCommand } from './commands/plan';


// --- 定义全局选项 ---
// 注意：全局选项定义在 program 上，它们的类型需要包含在各个子命令的 options 接口中 (通过继承 GlobalOptions)
program
  .version('1.0.0')
  // 将全局选项 verbose 添加到 program 上
  // Commander 会自动将解析到的全局选项添加到 action handlers 的 options 对象中
  .option('-v, --verbose', 'Enable verbose output');

// --- 注册子命令 ---
// 调用每个子命令的注册函数，并将主 program 实例传递进去
registerApplyCommand(program);
registerPlanCommand(program);

// --- 解析命令行参数 ---
// program.parse() 会解析 process.argv
// 如果有子命令匹配，会触发相应子命令的 action handler
// 如果没有子命令匹配，或者有帮助/版本等选项，commander 会处理并可能退出
program.parse(process.argv);