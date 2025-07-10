import type {Command} from "commander";
import {Project} from "@qpa/core";
import {z} from "zod/v4";

import {_OptionTableImpl} from "../../zod_ext.ts";
import {exit} from 'node:process';
import * as inquirer from '@inquirer/prompts';

import _ from 'lodash';
import path from "node:path";
import fs from 'fs/promises';
import {_GlobalOptions, ApplyFunc, Cli} from '../../cli.ts';

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends _GlobalOptions {
}

// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(parentCommand: Command, cli: Cli, varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>, apply: ApplyFunc<Vars>): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action(async (options: ApplyOptions) => {
      if (options.verbose) {
        console.log(`Options:${JSON.stringify(options)}`);
      }


      let vars: any = {};

      await fs.mkdir(cli.workdir, {recursive: true})
      const varsJsonPath = path.join(cli.workdir, 'vars.json');

      const varConfigContent = await readFile(varsJsonPath)
      if (varConfigContent) {
        vars = JSON.parse(varConfigContent);
        const safeParseVars = await varsSchema.safeParseAsync(vars);
        if (safeParseVars.success) {

        }
      }


      for (const [varKey, varField] of Object.entries(varsSchema.shape)) {
        if (!(varField instanceof z.ZodType)) {
          continue;
        }
        vars[varKey] = await readVarValue(varsSchema, vars, varKey, varField);
      }
      vars = await varsSchema.parseAsync(vars);


      await cli.project.apply(async (project: Project) => {
        await apply({
          project: project,
          vars: vars as Vars
        });
      })
    });
}

async function readVarValue<Vars>(varsSchema: z.ZodObject<Record<keyof Vars, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>, z.core.$strip>, vars: Vars, varKey: string, varField: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>): Promise<unknown | symbol> {
  const meta = varField.meta()

  var varTitle = `${varKey}`;
  if (meta?.title) {
    varTitle += `: ${meta?.title}`;
  }
  if (meta?.description) {
    varTitle += ` (${meta?.description})`;
  }

  const optionTable = (meta?.optionTable instanceof _OptionTableImpl) ? meta.optionTable : null;
  const n = await inquirer.number({
    message: `[数字输入] ${varTitle}`,
  })
  console.log('number', n)

  // 未提供选项表的字段让用户自己输入
  if (!optionTable) {
    return inquirer.input({
      message: `[文本输入] ${varTitle}`,
      validate: async (value) => {
        // check field is not required
        // const feildParsedResult = await varField.safeParseAsync(value)

        const errors = [];

        const tempVars = {
          ...vars,
          [varKey]: value
        }
        const modelParseResult = await varsSchema.safeParseAsync(tempVars);
        console.log("debug2", modelParseResult, value, tempVars)
        if (!modelParseResult.success) {
          errors.push(...modelParseResult.error.issues.filter(e => _.isEqual(e.path, [varKey])).map(e => e.message))
        }

        if (errors.length === 0) {
          return true;
        }
        return errors.length === 0 ? true : `ERROR:\n ${errors.map((value, index) => `${index + 1} ${value} \n`)} `;
      }
    });
  }

  const optionTableData = await optionTable.query(vars as any)
  if (optionTableData.length == 0) {
    console.log(`${varTitle} : no option data`)
    exit(1)
  }

  return inquirer.select({
    message: `[单选] ${varTitle} `,
    choices: optionTableData.map((optionRow) => {
      let optionRowDescription = ""
      for (const [optionKey, optionField] of Object.entries(optionTable.optionSchema.shape)) {
        // 使用方括号表示法从 optionRow 中获取 optionKey 对应的值
        const optionFieldDesc = optionField.meta()?.description ?? optionKey;
        const optionValue = optionRow[optionKey as keyof typeof optionRow];
        optionRowDescription += `${optionFieldDesc}:${optionValue}, `
      }
      return {
        pageSize: 10,
        value: optionTable.getValue(optionRow),
        name: optionRowDescription,
      };
    }),
  });
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && 'code' in e && 'errno' in e;
}

async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, {encoding: 'utf-8'});
  } catch (error) {
    // 文件不存在属于正常情况，即读到空内容
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return null;
    }
    //其他情况，比如无权访问等，目前看成异常直接抛出
    throw error;
  }
}