import * as apply from './apply';
import * as destroy from './destroy';
import * as plan from './plan';
import type {Command} from "commander";


export default function registerCommand(parentCommand: Command): void {
    const papa = parentCommand.command('papa')
        .description('papa mode')

    apply.default(papa);
    destroy.default(papa);
    plan.default(papa);
}

