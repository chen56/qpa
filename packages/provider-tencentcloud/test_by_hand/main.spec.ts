// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {Project} from "@qpa/core";
import {allowServices, TencentCloudProvider} from '../src/providers/tencent_cloud/index.ts';

describe('手工运行的测试', () => {
    it('direct mode destory', () => {
        let project=new Project({name:"test"});

        new TencentCloudProvider(project, {
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
            allowedResourceServices: allowServices
        });
        expect(project.name).toBe("test");
    });
});
