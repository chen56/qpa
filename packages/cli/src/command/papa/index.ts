import * as apply from './apply.js';
import * as destroy from './destroy.js';
import * as plan from './plan.ts';
import type {Command} from "commander";
import {Cli} from "src/index.ts";


export default function registerCommand(cli: Cli, parentCommand: Command): void {
    const papa = parentCommand.command('papa')
        .description('papa mode')

    apply.default(cli,papa);
    destroy.default(cli,papa);
    plan.default(cli,papa);
}

