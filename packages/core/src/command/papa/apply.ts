import type {GlobalOptions} from '@/internal/common';
import {loadPlannedConfig} from '@/internal/common';
import type {Project} from "@/index";
import type {Command} from "commander";

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
}

// 导出一个函数，用于注册 apply 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand(parentCommand: Command): void {
    // 在父命令上创建 'apply' 子命令
    parentCommand.command('apply <config>')
        .description('apply config')
        // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
        .action(async (config: string, options: ApplyOptions) => {
            if (options.verbose) {
                console.log(`${new Date().toISOString()} - apply <${config}>.`);
                console.log(`Options:`, options);
            }
            const resourceSpace: Project = await loadPlannedConfig(config,options);
            await resourceSpace.apply();
        });
}