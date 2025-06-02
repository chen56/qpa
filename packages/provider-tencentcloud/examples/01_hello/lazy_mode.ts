// // noinspection JSUnusedGlobalSymbols
// import {LazyConfig, LazyProject} from "@qpa/core";
//
// import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";
//
//
// export default LazyConfig.plannedMode({
//   before: async (project: LazyProject): Promise<void> => {
//
//     const tc = TencentCloud.createFactory({
//       scope: {
//         type:"TagBaseResourceScope",
//         scopeName: "test",
//       },
//       _credential: {
//         secretId: process.env.TENCENTCLOUD_SECRET_ID!,
//         secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
//       },
//     });
//     console.log("project:",project)
//     await tc.vpc.vpc({
//       name: "main",
//       spec: {
//         Region: "ap-guangzhou",
//         VpcName: "test-vpc",
//         CidrBlock: '10.0.0.0/16',
//       }
//     });
//   }
// });