// src/command/destroy.ts
import {GlobalOptions, loadDirectConfig} from '@/internal/common.ts';

import {Config} from "@/index.ts";
import type {Command} from "commander";

interface Options extends GlobalOptions {
}

// 导出一个函数，用于注册 plan 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand(parentCommand: Command): void {
    // 在父命令上创建 'plan' 子命令
    parentCommand.command('destroy <configPath>')
        .description('destroy all Configured Resources and Deconfigured Resources')
        // 原代码 action signature 接收了 name 参数，但 command 定义没有 arguments。
        // 如果 plan 不需要 arguments, 只需接收 options。这里修正为只接收 options。
        .action(async (configPath: string, options: Options) => {
            const config: Config = await loadDirectConfig(configPath, options);
            const project = config.project;
            await project.destroy();
        });
}