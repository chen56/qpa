// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {Project} from "@qpa/core";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

describe('手工运行的测试', () => {
    it('direct mode destory', () => {
        let project=new Project({name:"test"});

        const tc = TencentCloud.direct({
            project:project,
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
        });
        expect(tc.provider.project.name).toBe("test");
    });
});
