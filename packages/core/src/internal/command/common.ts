import {Command} from "commander";

export class MyRootCommand extends Command {
    // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
    // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
    createCommand(name:string) {
        return new Command(name)
            .option('-v, --verbose', 'use verbose logging');
    }
}
