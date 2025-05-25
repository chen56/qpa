// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {LazyProject} from "@qpa/core";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

describe('手工运行的测试', () => {
    it('Eager mode destroy', () => {
        let project=new LazyProject({name:"test"});

        const tc = TencentCloud.eagerMode({
            project:project,
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
        });
        expect(tc.provider.project.name).toBe("test");
    });
});
