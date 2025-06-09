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
const cvmGuangzhou = tc.cvm.getClient("ap-guangzhou");

const zonesResponse = await cvmGuangzhou.DescribeZones()
const availableZones = (zonesResponse.ZoneSet ?? [])?.filter(e => e.ZoneState === "AVAILABLE");
console.log("availableZones: ", availableZones?.map(e => e.Zone))

const zoneInstanceConfigInfosResponse = await cvmGuangzhou.DescribeZoneInstanceConfigInfos({
  Filters: [
    // 不合法查询形式：
    // {Name: "zone", Values: ["ap-guangzhou-6","ap-guangzhou-7"]},
    // 合法查询形式：
    // {Name: "zone", Values: ["ap-guangzhou-6"]},
    // {Name: "zone", Values: ["ap-guangzhou-7"]},
    ...availableZones.map(e => ({Name: "zone", Values: [e.Zone!]})),
    {Name: "instance-charge-type", Values: ["SPOTPAID"]},

    // 按实例类型家族过滤（可选）
    // {  Name: "instance-family", Values: ["S5"]    },
    // 按实例类型过滤（可选）
    // { Name: "instance-type",  Values: ["S5.SMALL1"]   }
  ]
});
const zoneInstanceConfigInfos = zoneInstanceConfigInfosResponse.InstanceTypeQuotaSet!.filter(e => e.Status === "SELL").sort((a, b) => {
  return a.Price!.UnitPriceDiscount! - b.Price!.UnitPriceDiscount!
});
console.log("zoneInstanceConfigInfosResponse: ", zoneInstanceConfigInfos.length + "/" + zoneInstanceConfigInfosResponse.InstanceTypeQuotaSet?.length, zoneInstanceConfigInfos.map(e => JSON.stringify({
  TypeName: e.TypeName,
  InstanceType: e.InstanceType,
  Zone: e.Zone,
  Price: e.Price,
  Status: e.Status,
  StatusCategory: e.StatusCategory
})))

const imagesResponse = await cvmGuangzhou.DescribeImages({
  Filters: [
    {Name: "image-type", Values: ["PUBLIC_IMAGE"]},
    {Name: "platform", Values: ["Ubuntu"]},
    {Name: "image-name", Values: ["Ubuntu Server 24.04 LTS 64bit"]},
  ],
  Limit: 100,
});
console.log("imagesResponse: ", imagesResponse.ImageSet?.map(e => JSON.stringify({ImageId: e.ImageId, ImageName: e.ImageName, ImageSize: e.ImageSize, Platform: e.Platform})))

const image = imagesResponse.ImageSet!.find(e => e.ImageName === "Ubuntu Server 24.04 LTS 64bit")!;

// 选最便宜的机型
const instanceType = zoneInstanceConfigInfos[0].InstanceType!;

const inquiryPriceRunInstancesResponse = await cvmGuangzhou.InquiryPriceRunInstances({
  Placement: {
    Zone: availableZones[0].Zone!,
  },
  ImageId: image.ImageId!,
  InstanceChargeType: "SPOTPAID",
  InstanceType: instanceType,
  SystemDisk: {
    DiskType: "CLOUD_PREMIUM",
    DiskSize: 20,
  },
  InternetAccessible: {
    InternetChargeType: "TRAFFIC_POSTPAID_BY_HOUR",
    InternetMaxBandwidthOut: 1,
    PublicIpAssigned: true,
  }
});
console.log("inquiryPriceRunInstancesResponse: ", instanceType, JSON.stringify(inquiryPriceRunInstancesResponse.Price))


await project.refresh();
console.log("project:", project.resourceInstances.map(e => e.name))

await project.destroy();
console.log('list all resource');
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
      Zone: "ap-guangzhou-7",
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
      InstanceChargeType: "SPOTPAID",
      InstanceType: instanceType,
      ImageId: image.ImageId!,
      InstanceName: "test-cvm-instance1",
      VirtualPrivateCloud: {
        VpcId: vpc.actualInstance.state.VpcId!,
        SubnetId: subnet.actualInstance.state.SubnetId!,
      },
      Placement: {
        Zone: subnet.actualInstance.state.Zone!,
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
  });

  console.log("created cvmInstance1:", cvmInstance1)
  console.log("project:", project.resourceInstances.map(e => e.name))

});
// exit(0);

