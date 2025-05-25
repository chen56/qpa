// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {EagerProject} from "@qpa/core";
import {Cli} from "src/index.ts";

describe('study undefined', () => {
  it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
    let p = EagerProject.of({
      setup: async (project: EagerProject): Promise<void> => {
        console.log(project)
      }
    });
    console.log(p)
  });
});
