// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {TextFixture} from "../test/fixture.ts";

describe('cvm', {timeout: 15000}, async () => {
  const fixture = TextFixture.of();
  const {tc} = fixture;
  const cvmGuangzhou = tc.cvm.getClient("ap-guangzhou");
  it('DescribeZones', async () => {
    const zonesResponse = await cvmGuangzhou.DescribeZones()
    const availableZones = (zonesResponse.ZoneSet ?? [])?.filter(e => e.ZoneState === "AVAILABLE");
    console.log("availableZones: ", availableZones?.map(e => e.Zone))
  });
  it('DescribeZoneInstanceConfigInfos', async () => {
    const zoneInstanceConfigInfosResponse = await cvmGuangzhou.DescribeZoneInstanceConfigInfos({
      Filters: [
        // 不合法查询形式：
        // {Name: "zone", Values: ["ap-guangzhou-6","ap-guangzhou-7"]},
        // 合法查询形式：
        {Name: "zone", Values: ["ap-guangzhou-6"]},
        {Name: "zone", Values: ["ap-guangzhou-7"]},
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
  });

  it('DescribeImages', async () => {
    const imagesResponse = await cvmGuangzhou.DescribeImages({
      Filters: [
        {Name: "image-type", Values: ["PUBLIC_IMAGE"]},
        {Name: "platform", Values: ["Ubuntu"]},
        // { Name: "image-name", Values: ["Ubuntu Server 24.04 LTS 64bit"] },
      ],
      Limit: 100,
    });
    console.log("imagesResponse: ", imagesResponse.ImageSet?.map(e => JSON.stringify({ImageId: e.ImageId, ImageName: e.ImageName, ImageSize: e.ImageSize, Platform: e.Platform})))

  })

  it('DescribeInstances', async () => {
    const response = await cvmGuangzhou.DescribeInstances({
      InstanceIds: ["ins-xxxxxxxx"],//not exists
    });
    expect(response.InstanceSet?.length).toBe(0)
  })

  it('InquiryPriceRunInstances', async () => {
      const inquiryPriceRunInstancesResponse = await cvmGuangzhou.InquiryPriceRunInstances({
        Placement: {
          Zone: "ap-guangzhou-7", // 可用区
        },
        ImageId: "img-mmytdhbn",
        InstanceChargeType: "SPOTPAID",
        InstanceType: "SA2.MEDIUM2",
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
      console.log("inquiryPriceRunInstancesResponse: ", JSON.stringify(inquiryPriceRunInstancesResponse, null, 2))
    }
  );
});
