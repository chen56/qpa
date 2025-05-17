import * as apply from './apply.js';
import * as destroy from './destroy.js';
import * as plan from './plan.ts';
import type {Command} from "commander";


export default function registerCommand(parentCommand: Command): void {
    const papa = parentCommand.command('papa')
        .description('papa mode')

    apply.default(papa);
    destroy.default(papa);
    plan.default(papa);
}

