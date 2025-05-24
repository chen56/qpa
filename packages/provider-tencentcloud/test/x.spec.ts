// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {PlannedProject} from "@qpa/core";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

describe('study undefined', () => {
    it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
        let project=new PlannedProject({name:"test"});

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
