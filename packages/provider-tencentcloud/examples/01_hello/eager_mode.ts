import {Project} from "@qpa/core";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

const project = Project.of({name:"test"});

const tc=TencentCloud.createFactory(project,{
  scope: {
    type: "TagBaseResourceScope",
    scopeName: "test",
  },
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});
await project.refresh();
await project.destroy();
await project.apply(async project=>{
  const vpc = await tc.vpc.vpc({
    name: "main",
    spec: {
      Region: "ap-guangzhou",
      VpcName: "test-vpc",
      CidrBlock: '10.0.0.0/16',
    }
  });
  console.log("vpc:", vpc.expected, vpc.actual)
  console.log("project:", project)
});

