// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {VpcSubnetState} from "../src";
import {TextFixture} from "./fixture.ts";
import {ResourceInstance} from "@qpa/core";

describe('vpc_vpc', () => {
  const fixture = TextFixture.of();
  const {tc, project} = fixture;

  beforeEach(async () => {
    await fixture.reset();
  })
  afterEach(async () => {
    await fixture.reset();
  })

  it('vpc up', {timeout: 15000}, async () => {
    await project.up(async _ => {
      const vpc = await tc.vpc.vpc({
        name: "vpc1",
        spec: {
          Region: "ap-guangzhou",
          VpcName: "test-vpc",
          CidrBlock: '10.0.0.0/16',
        }
      });

      let expectedSubnet = {
        name: "test-subnet1",
        spec: {
          Region: vpc.state.Region,
          Zone: "ap-guangzhou-2",
          VpcId: vpc.state.VpcId!,
          SubnetName: "test-subnet",
          CidrBlock: '10.0.1.0/24',
        }
      };
      const subnet = await tc.vpc.subnet(expectedSubnet);

      expect(project.resources.length).toBe(2);
      expect(project.resources[0]).toBe(vpc);
      expect(project.resources[1]).toBe(subnet);

      expect(subnet.actualInstance).toMatchObject({
        name: expectedSubnet.name,
        state: {
          Region: expectedSubnet.spec.Region,
          Zone: expectedSubnet.spec.Zone,
          SubnetName: expectedSubnet.spec.SubnetName,
          CidrBlock: expectedSubnet.spec.CidrBlock,
          VpcId: vpc.actualInstance.state.VpcId,
        }
      } as ResourceInstance<VpcSubnetState> );

    });
  });

});
