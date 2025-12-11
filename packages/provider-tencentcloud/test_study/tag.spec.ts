// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, it} from "vitest";
import {TextFixture} from "../test/fixture.ts";
import {_TagClientWarp} from "../src/internal/tag_service.ts";
import {Constants} from "@planc/core";

describe('tags', {timeout: 15000}, async () => {
  const fixture = TextFixture.of();
  const tagClient = new _TagClientWarp(fixture.tcContext, fixture.config);

  it('DescribeResourceTags...', async () => {
    console.log("DescribeResourceTagsByTagKeys", toJson(await tagClient.getClient().DescribeResourceTagsByTagKeys({
            ServiceType: "vpc",
            ResourcePrefix: "subnet",
            ResourceIds: ["subnet-30ml1e7s"],
            ResourceRegion: "ap-guangzhou",
            TagKeys: [
              Constants.tagNames.project,
              Constants.tagNames.resource
            ],
          }
        )
      )
    );

    console.log("DescribeResourceTags", toJson(await tagClient.getClient().DescribeResourceTags({
      // ServiceType: "vpc",
      // ResourcePrefix: "subnet",
      // ResourceRegion: "ap-guangzhou",
      ResourceId: "subnet-30ml1e7s",
    })))

    console.log("DescribeResourceTagsByResourceIds", (await tagClient.getClient().DescribeResourceTagsByResourceIds({
      ServiceType: "vpc",
      ResourcePrefix: "subnet",
      ResourceIds: ["subnet-30ml1e7s"],
      ResourceRegion: "ap-guangzhou",
      // ResourceRegion: "ap-guangzhou",
    })))
  })

  it('DescribeTag...', async () => {
    console.log("DescribeTagValues", (await tagClient.getClient().DescribeTagValues({TagKeys: [Constants.tagNames.project]})).Tags)
    console.log("DescribeTagValuesSeq", (await tagClient.getClient().DescribeTagValuesSeq({TagKeys: [Constants.tagNames.project]})).Tags)
    console.log("DescribeTagKeys", (await tagClient.getClient().DescribeTagKeys({})).Tags)
    console.log("DescribeTags", (await tagClient.getClient().DescribeTags({})).Tags)
  });

  it('DescribeResources*...', async () => {
    console.log("DescribeResourcesByTagsUnion", toJson(await tagClient.getClient().DescribeResourcesByTagsUnion({
      TagFilters: [
        {TagKey: Constants.tagNames.project, TagValue: ["test"]},
        {TagKey: Constants.tagNames.resource, TagValue: ["test-subnet1"]},
      ],
      // ResourceId: "subnet-on5f8p2w",
    })))

    console.log("DescribeResourcesByTags", toJson(await tagClient.getClient().DescribeResourcesByTags({
            // ResourceRegion: "ap-guangzhou",
            // ServiceType: "vpc",
            // ResourcePrefix: "subnet",
          ResourceId: "subnet-on5f8p2w",
          TagFilters: [
              {TagKey: Constants.tagNames.project, TagValue: ["test"]},
              {TagKey: Constants.tagNames.resource, TagValue: ["test-subnet1"]},
            ],
          }
        )
      )
    );
  });
});

function toJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}