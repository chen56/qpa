import {Project} from "@qpa/core";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

const project = Project.of({name: "test"});
const tc = new TencentCloud(project, {
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});

await project.refresh();
console.log("project:", project.resourceInstances.map(e => e.name))

await project.destroy();
console.log('list all resource');

const vars = {
  zone: "ap-guangzhou-7",
  instanceType: "SA2.MEDIUM2",// 选最便宜的机型
  imageId: "img-mmytdhbn",//Ubuntu Server 24.04 LTS 64bit
}

// exit(1);
for (const r of project.resourceInstances) {
  console.log('project.resourceInstances[%s]: %O', project.resourceInstances.length, {
    key: r.name,
    state: r.state,
  });
}
console.log('list all resource end');

await project.apply(async project => {
  const vpc = await tc.vpc.vpc({
    name: "test-vpc1",
    spec: {
      Region: "ap-guangzhou",
      VpcName: "test-vpc",
      CidrBlock: '10.0.0.0/16',
    }
  });
  console.log("created vpc:", vpc.actualInstance.toJson())
  console.log("project:", project.resourceInstances.map(e => e.name))

  const subnet = await tc.vpc.subnet({
    name: "test-subnet1",
    spec: {
      Region: "ap-guangzhou",
      Zone: vars.zone,
      VpcId: vpc.actualInstance.state.VpcId!,
      SubnetName: "test-subnet",
      CidrBlock: '10.0.1.0/24',
    }
  });
  console.log("created subnet:", subnet.actualInstance.toJson())

  const cvmInstance1 = await tc.cvm.instance({
      name: "cvmInstance1",
      spec: {
        Region: "ap-guangzhou",
        Placement: {
          Zone: subnet.actualInstance.state.Zone!,
        },
        InstanceChargeType: "SPOTPAID",
        InstanceType: vars.instanceType,
        ImageId: vars.imageId,
        InstanceName: "test-cvm-instance1",
        VirtualPrivateCloud: {
          VpcId: vpc.actualInstance.state.VpcId!,
          SubnetId: subnet.actualInstance.state.SubnetId!,
        },
        SystemDisk: {
          DiskType: "CLOUD_PREMIUM",
          DiskSize: 20,
        },
        InternetAccessible: {
          InternetChargeType: "TRAFFIC_POSTPAID_BY_HOUR",
          InternetMaxBandwidthOut: 1,
          PublicIpAssigned: true,
        }
      },
    }
  );

  console.log("created cvmInstance1:", cvmInstance1)
  console.log("project:", project.resourceInstances.map(e => e.name))
});
// exit(0);

