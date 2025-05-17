import * as apply from './apply.js';
import * as destroy from './destroy.js';
import * as plan from './plan.ts';
import * as papa from './papa/index.ts';
import process from "node:process";
import {MyRootCommand} from "@/command/common.ts";

const program = new MyRootCommand();
program
  .version('1.0.0') ;

// --- 注册子命令 ---
// 调用每个子命令的注册函数，并将主 program 实例传递进去
apply.default(program);
destroy.default(program);
plan.default(program);
papa.default(program);

// --- 解析命令行参数 ---
// program.parse() 会解析 process.argv
// 如果有子命令匹配，会触发相应子命令的 action handler
// 如果没有子命令匹配，或者有帮助/版本等选项，commander 会处理并可能退出
program.parse(process.argv);