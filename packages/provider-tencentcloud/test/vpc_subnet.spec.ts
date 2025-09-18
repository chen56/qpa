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

  it('vpc apply', {timeout: 15000}, async () => {
    await project.apply(async _ => {
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
          Region: vpc.actualInstance.state.Region,
          Zone: "ap-guangzhou-2",
          VpcId: vpc.actualInstance.state.VpcId!,
          SubnetName: "test-subnet",
          CidrBlock: '10.0.1.0/24',
        }
      };
      const subnet = await tc.vpc.subnet(expectedSubnet);

      expect(project.resourceInstances.length).toBe(2);
      expect(project.resourceInstances[0]).toBe(vpc.actualInstance);
      expect(project.resourceInstances[1]).toBe(subnet.actualInstance);

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
