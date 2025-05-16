// src/types.ts

// 定义全局选项的接口
import {Config, Project} from "@/index.ts";
import process from "node:process";
import path from "node:path";
import fs from "node:fs";

export interface GlobalOptions {
    verbose?: boolean;
}

export async function loadDirectConfig(configPath: string, options:GlobalOptions): Promise<Config> {
    const currentWorkingDirectory: string = process.cwd();
    configPath = path.resolve(currentWorkingDirectory, configPath);
    if(options.verbose){
        console.log(`${new Date().toISOString()} - loadConfig <${configPath}>`);
    }

    fs.existsSync(configPath) || (() => {
        throw new Error(`config file ${configPath} not found`);
    })();
    const configModule = await import(configPath);
    const config = configModule.default;
    if(!(config instanceof Config)){
        throw new Error(`Module '${configPath}' does not export a default Config, Please use: export default Config.directMode()/Config.plannedMode, config:${JSON.stringify(config)}`);
    }

    return config;
}
export async function loadPlannedConfig(config: string, options:GlobalOptions): Promise<Project> {
    const currentWorkingDirectory: string = process.cwd();
    const configPath = path.resolve(currentWorkingDirectory, config);
    if(options.verbose){
        console.log(`${new Date().toISOString()} - loadConfig <${configPath}>`);
    }

    fs.existsSync(configPath) || (() => {
        throw new Error(`config file ${configPath} not found`);
    })();
    const configModule = await import(configPath);
    if (typeof configModule.papaMode !== 'function') {
        console.error(`Module '${configPath}' does not export a papaMode function.`);
    }
    return await configModule.papaMode();
}

export async function* queryPage<T>(query: (offset: number) => Promise<{
    // 总记录数，可以不提供
    totalCount?: number;
    // 当前页的记录
    rows: Array<T>;
    // 每页最大记录数
    limit:number;
}>) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const page = await query(offset);
        const rows:T[] = page.rows??[];

        for (const row of rows) {
            yield row;
        }
        offset = offset+rows.length;

        if (page.totalCount){
            hasMore = offset<page.totalCount;
        }else{
            hasMore = rows.length===page.limit;
        }
    }
}
