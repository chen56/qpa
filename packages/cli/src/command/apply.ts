import {GlobalOptions} from './common.ts';
import type {Command} from "commander";
import {Project} from "@qpa/core";
import {z} from "zod/v4";

import {ApplyFunc} from "../interface.ts";
import {Cli} from "../cli.ts";
import {_OptionTableImpl} from "../zod.ts";
import {exit} from 'node:process';
import * as inquirer from '@inquirer/prompts';

import _ from 'lodash';

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
}

// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(cli: Cli, parentCommand: Command, varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>, apply: ApplyFunc<Vars>): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action(async (options: ApplyOptions) => {
      console.log(`apply`);

      if (options.verbose) {
        console.log(`sssOptions:${JSON.stringify(options)}`);
      }

      let vars: any = {};

      for (const [varKey, varField] of Object.entries(varsSchema.shape)) {
        if (!(varField instanceof z.ZodType)) {
          continue;
        }
        vars[varKey] = await readRarValue(varsSchema, vars, varKey, varField);
      }
      vars=await varsSchema.parseAsync(vars);

      // console.log(`Your Vars save(TODO) at ./vars.json : ${JSON.stringify(vars, null, 2)}`);

      await cli.project.apply(async (project: Project) => {
        await apply({
          project: project,
          vars: vars as Vars
        });
      })
    });
}

async function readRarValue<Vars>(varsSchema: z.ZodObject<Record<keyof Vars, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>, z.core.$strip>, vars: Vars, varKey: string, varField: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>): Promise<unknown | symbol> {
  const meta = varField.meta()

  var varTitle = `${varKey}`;
  if (meta?.title) {
    varTitle += `: ${meta?.title}`;
  }
  if (meta?.description) {
    varTitle += ` (${meta?.description})`;
  }

  // console.log(`. ${varDescription} ${JSON.stringify(meta)}`)

  const optionTable = (meta?.optionTable instanceof _OptionTableImpl) ? meta.optionTable : null;

  // 未提供选项表的字段让用户自己输入
  if (!optionTable) {
    return inquirer.input({
      message: `[文本输入] ${varTitle}`,
      validate:  async (value) => {
        // check field is not required
        // const feildParsedResult = await varField.safeParseAsync(value)

        const errors=[];

        const tempVars={
          ...vars,
          [varKey]:value
        }
        const modelParseResult=await varsSchema.safeParseAsync(tempVars);
        console.log("debug2",modelParseResult,value,tempVars)
        if (!modelParseResult.success) {
          errors.push(...modelParseResult.error.issues.filter(e=>_.isEqual(e.path,[varKey])).map(e=>e.message))
        }

        if(errors.length===0){
          return true;
        }
        return errors.length===0?true:`ERROR:\n ${errors.map((value,index)=>`${index+1} ${value} \n`)} `;
      }
    });
  }

  const optionTableData = await optionTable.fetchData(vars as any)
  if (optionTableData.length == 0) {
    console.log(`${varTitle} : no option data`)
    exit(1)
  }

  return inquirer.select({
    message: `[单选] ${varTitle} `,
    choices: optionTableData.map((optionRow) => {
      let optionRowDescription = ""
      for (const [optionKey, optionField] of Object.entries(optionTable.schema.shape)) {
        // 使用方括号表示法从 optionRow 中获取 optionKey 对应的值
        const optionFieldDesc = optionField.meta()?.description ?? optionKey;
        const optionValue = optionRow[optionKey as keyof typeof optionRow];
        optionRowDescription += `${optionFieldDesc}:${optionValue}, `
        // console.log(`.   optionKey key:${optionKey}. value:${optionValue}  desc:${optionFieldDesc}`);
      }
      return {
        pageSize:10,
        value: optionTable.valueGetter(optionRow),
        name: optionRowDescription,
      };
    }),
  });

}
