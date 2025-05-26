// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

describe('手工运行的测试', () => {
  it('Eager mode destroy', () => {
    const tc = TencentCloud.createEagerFactory({
      scope: {
        type:"TagBaseResourceScope",
        scopeName: "test",
      },
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
    });
    expect(tc.provider.scope.name).toBe("test");
  });
});
