// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";
import {Project} from "@qpa/core";

describe('手工运行的测试', () => {
  it('Eager mode destroy', () => {
    const project: Project = Project.of({name: "test"});
    const tc = TencentCloud.createFactory(project,{
      scope: {
        type: "TagBaseResourceScope",
        scopeName: "test",
      },
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
    });

    // project.providers.push(tc);
    //
    // project.refresh();
    //
    // project.getAcutalResoues();

    expect(tc.provider.scope.name).toBe("test");
  });

});
