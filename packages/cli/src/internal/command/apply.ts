import type {Command} from "commander";
import {Project} from "@qpa/core";
import * as z from "zod";

import {VarUI, VariableFactory, OptionTable} from "../../zod_ext.ts";
import {exit} from 'node:process';
import * as inquirer from '@inquirer/prompts';

import path from "node:path";
import fs from 'fs/promises';
import {_GlobalOptions, ApplyFunc, Cli} from '../../cli.ts';

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends _GlobalOptions {
}

// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(parentCommand: Command,
                                              cli: Cli,
                                              apply: ApplyFunc<Vars>,
                                              varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>,
                                              varsUI: Map<z.ZodType, VarUI>): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action(async (options: ApplyOptions) => {
      if (options.verbose) {
        console.log(`Options:${JSON.stringify(options)}`);
      }

      let vars: Vars = await _readVars(cli.workdir, varsSchema, varsUI)

      await cli.project.apply(async (project: Project) => {
        await apply({
          project: project,
          vars: vars
        });
      })
    });
}

async function _readVars<Vars>(workdir: string, varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>, varsUI: Map<z.ZodType, VarUI>): Promise<Vars> {

  let vars: any = {};

  await fs.mkdir(workdir, {recursive: true})
  const varsJsonPath = path.join(workdir, 'vars.json');

  const varConfigContent = await _readFile(varsJsonPath)
  if (varConfigContent) {
    vars = JSON.parse(varConfigContent);
    const safeParseVars = await varsSchema.safeParseAsync(vars);
    if (safeParseVars.success) {
      return vars;
    }
    console.error("ERROR - vars.json 格式错误, 重新设置参数值")
  }

  // 遍历 varsSchema 的字段,当前只遍历第一层，后续可能考虑遍历整棵object 树
  for (const [varKey, varField] of Object.entries(varsSchema.shape)) {
    // 忽略非schema字段
    if (!(varField instanceof z.ZodType)) {
      continue;
    }
    if (varField instanceof z.ZodObject) {
      throw new Error(`当前不支持嵌套对象: ${varKey}:${varField.shape}`)
    }
    const varUI = varsUI.get(varField as z.ZodType) ?? VariableFactory.createTextInput();
    vars[varKey] = await _readVarField(vars, varKey, varField, varUI);
  }
  const safeParseVars = await varsSchema.safeParseAsync(vars);
  if (!safeParseVars.success) {
    const issues = safeParseVars.error.issues.map(issue => `- ${issue.path}: ${issue.message}`).join("\n");
    console.error(`ERROR - vars.json 格式错误: \n${issues}`)
    exit(1);
  }

  await fs.writeFile(varsJsonPath, JSON.stringify(vars, null, 2))
  return vars;
}

async function _readVarField<Vars>(
  vars: Vars,
  varKey: string,
  varField: z.ZodType,
  varUI: VarUI,
): Promise<unknown | symbol> {
  let varTitle = (() => {
    const meta = varField.meta()
    let varTitle = `${varKey}`;
    if (meta?.title) {
      varTitle += `: ${meta?.title}`;
    }
    if (meta?.description) {
      varTitle += ` (${meta?.description})`;
    }
    return varTitle;
  })()

  switch (varUI.type) {
    case "qpa.TextInput":
      return inquirer.input({
        message: `[文本输入] ${varTitle}`,
        validate: async (value) => {
          // check field is not required
          const parsedResult = await varField.safeParseAsync(value)

          const errors = parsedResult.error?.issues ?? [];
          if (errors.length === 0) {
            return true;
          }
          return `ERROR:\n ${errors.map((value, index) => `${index + 1} ${value} \n`)} `;
        }
      });
    case "qpa.OptionTable":
      const optionTable = varUI as OptionTable<Vars, any, any>;
      const optionTableData = await optionTable.query(vars as any)
      if (optionTableData.length == 0) {
        console.log(`${varTitle} : FAIL: no option data`)

        exit(1)
      }
      return inquirer.select({
        message: `[单选] ${varTitle} `,
        choices: optionTableData.map((optionRow) => {
          let optionRowDescription = ""
          if (optionTable.columns) {
            for (const column of optionTable.columns) {
              if (typeof column === 'string') {
                optionRowDescription += `${column}:${optionRow[column as keyof typeof optionRow]}, `
              } else {
                optionRowDescription += `${column.name}:${column.getValue(optionRow)}, `
              }
            }
          } else {
            for (const [optionKey, optionValue] of Object.entries(optionRow)) {
              optionRowDescription += `${optionKey}:${optionValue}, `
            }
          }

          return {
            pageSize: 10,
            value: optionTable.getValue(optionRow),
            name: optionRowDescription,
          };
        }),
      });
    default:
      throw new Error(`Unsupported VarUI type: ${varUI.type}`);
  }
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && 'code' in e && 'errno' in e;
}

async function _readFile(filePath: string): Promise<string | null> {
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