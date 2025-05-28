import {LazyProject, LazyResource, Resource, ResourceConfig} from "@qpa/core";
import {VpcService, VpcSpec, VpcState} from "./vpc.ts";
import {TencentCloudProvider} from "../provider.ts";
import {SubnetService, SubnetSpec} from "./subnet.ts";

/**
 * 工厂方法类
 * 命名方式[ServiceType][Mode]Factory
 */
export class VpcFactory {
  constructor(readonly provider: TencentCloudProvider) {
  }

  async vpc(expected: ResourceConfig<VpcSpec>) {
    const service = this.provider._getService(VpcService.resourceType) as VpcService;
    let actual = await service.load(expected);
    if (actual.length == 0) {
      actual = [await service.create(expected)];
    }
    if(actual.length===0){
      throw new Error(`bug: 应该不会发生, 可能是QPA的bug, 资源${expected.name}的实际资源实例数量应该不为0, 但是目前为0 `)
    }

    if(actual.length>1){
      throw new Error(`名为(${expected.name})的资源, 发现重复/冲突资源实例(Duplicate/Conflicting Resources): 可能是重复创建等故障导致同名冲突实例，需要您手工清除或执行destroy后apply重建,冲突实例：${actual.map(e=>e.toJson())}`)
    }

    const result = new Resource(expected, actual);
    this.provider._resources.set(result.name, result);
    return result;
  }

  async subnet(expected: ResourceConfig<SubnetSpec>) {
    const service = this.provider._getService(SubnetService.resourceType) as SubnetService;
    let actual = await service.load(expected);
    if (actual.length == 0) {
      actual = [await service.create(expected)];
    }
    if(actual.length===0){
      throw new Error(`bug: 应该不会发生, 可能是QPA的bug, 资源${expected.name}的实际资源实例数量应该不为0, 但是目前为0 `)
    }

    if(actual.length>1){
      throw new Error(`名为(${expected.name})的资源, 发现重复/冲突资源实例(Duplicate/Conflicting Resources): 可能是重复创建等故障导致同名冲突实例，需要您手工清除或执行destroy后apply重建,冲突实例：${actual.map(e=>e.toJson())}`)
    }

    const result = new Resource(expected, actual);
    this.provider._resources.set(result.name, result);
    return result;

  }
}

/**
 * 工厂方法类
 */
export class VpcLazyFactory {
  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
  }

  vpc(props: ResourceConfig<VpcSpec>): LazyResource<VpcSpec, VpcState> {
    const result = new LazyResource<VpcSpec, VpcState>(this.provider, {
      ...props,
      service: this.provider._getService(VpcService.resourceType) as VpcService,
    });
    this.project._configuredResources.push(result);
    return result;
  }
}