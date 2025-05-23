// noinspection JSUnusedGlobalSymbols
import {Config, LazyProject} from "@qpa/core";

import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";


export default Config.plannedMode({
    project: new LazyProject({
        name: "test",
    }),
    setup: async (project: LazyProject): Promise<void> => {

        const tc = TencentCloud.direct({
            project: project,
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
        });

        await tc.vpc.vpc({
            name: "main",
            spec: {
                Region: "ap-guangzhou",
                VpcName: "test-vpc",
                CidrBlock: '10.0.0.0/16',
            }
        });
    }
});