// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, it} from "vitest";
import {Project} from "@qpa/core";

describe('study undefined', () => {
  it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
    let p = Project.of({
      setup: async (project: Project): Promise<void> => {
        console.log(project)
      }
    });
    console.log(p)
  });
});
