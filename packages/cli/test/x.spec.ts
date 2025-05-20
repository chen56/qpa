// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {Project} from "@qpa/core";

describe('study undefined', () => {
    it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
        let project=new Project({name:"test"});

        // new TencentCloudProvider(project, {
        //     credential: {
        //         secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        //         secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
        //     },
        //     allowedResourceServices: allowServices
        // });
        expect(project.name).toBe("test");
    });
});
