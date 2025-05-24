// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {Config, PlannedProject} from "@qpa/core";
import {Cli} from "src/index.ts";

describe('study undefined', () => {
    it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
        const cli=Cli.of(Config.directMode({
            project: {
                name: "test",
            },
            setup: async (project: PlannedProject): Promise<void> => {
                console.log(project.name)
            }
        } ));
        expect(cli.config.project.name).toBe("test");
    });
});
