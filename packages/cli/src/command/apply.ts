import {GlobalOptions} from './common.ts';
import type {Command} from "commander";
import {Project} from "@qpa/core";
import {z} from "zod/v4";

import * as p from '@clack/prompts';
import {ApplyFunc, VarsSchema} from "../interface.ts";
import {Cli} from "../cli.ts";
import {_OptionTableImpl} from "../zod.ts";
import { exit } from 'node:process';

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
}

// 导出一个函数，用于注册 apply 子命令
function checkCancel(value: unknown): void {
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
}

// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(cli: Cli, parentCommand: Command, varsSchemaCreator: VarsSchema<Vars>, apply: ApplyFunc<Vars>): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action(async (options: ApplyOptions) => {
      p.intro(`apply`);

      if (options.verbose) {
        p.log.info(`sssOptions:${JSON.stringify(options)}`);
      }

      const vars: Partial<Vars> = {};
      const schema = varsSchemaCreator(vars);

      for (const [varKey, varField] of Object.entries(schema.shape)) {
        if (!(varField instanceof z.ZodType)) {
          continue;
        }
        const value = await readRarValue(varKey, varField)
        checkCancel(value);
        vars[varKey] = value;
      }

      p.outro(`You're all set!`);


      await cli.project.apply(async (project: Project) => {
        await apply({
          project: project,
          vars: vars as Vars
        });
      })
    });
}

async function readRarValue(varKey: string, varField: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>): Promise<unknown | symbol> {
  const meta = varField.meta()
  const varDescription = meta?.description ?? varKey;

  // console.log(`. ${varDescription} ${JSON.stringify(meta)}`)


  const optionTable = (meta?.optionTable instanceof _OptionTableImpl) ? meta.optionTable : null;

  // 未提供选项表的字段让用户自己输入
  if (!optionTable) {
    return await p.text({message: varDescription})
  }

  const optionTableData = await optionTable.fetchData()
  if (optionTableData.length == 0) {
    p.cancel(`${varDescription} : no option data`)
    exit(1)
  }


  const clackOptions: p.Option<typeof varField.type>[] = [];
  for (const optionRow of optionTableData) {
    // console.log(`. optionRow ${JSON.stringify(optionRow)}`)
    let optionRowDescription = ""
    for (const [optionKey, optionField] of Object.entries(optionTable.schema.shape)) {
      // 使用方括号表示法从 optionRow 中获取 optionKey 对应的值
      const optionFieldDesc = optionField.meta()?.description ?? optionKey;
      // if (!(optionField instanceof z.ZodType)) {
      //   continue;
      // }
      const optionValue = optionRow[optionKey as keyof typeof optionRow];
      optionRowDescription += `${optionFieldDesc}:${optionValue},`
      // console.log(`.   optionKey key:${optionKey}. value:${optionValue}  desc:${optionFieldDesc}`);
    }
    clackOptions.push({
      value: optionRow[optionTable.valueKey],
      label: optionRowDescription,
    })
    // console.log(`.   clackOptions:${JSON.stringify(clackOptions)}`)
  }
  return await p.select({
    message: `${varDescription}`,
    options: clackOptions,
  });
}
