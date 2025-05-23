import {Command} from "commander";
import {Config, Project} from "@qpa/core";
import process from "node:process";
import path from "node:path";
import fs from "node:fs";

export class RootCommand extends Command {

    // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
    // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
    createCommand(name:string) {
        return new Command(name)
            .option('-v, --verbose', 'use verbose logging');
    }
}



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
    // if(!(configModule.default instanceof Config)){
    //     throw new Error(`Module '${configPath}' does not export a default Config, Please use: export default Config.directMode()/Config.plannedMode, config:${JSON.stringify(config)}`);
    // }

    return configModule.default;
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
