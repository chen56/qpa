import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {_TencentCloudAware, TencentCloudCredential, TencentCloudProvider, TencentCloudResourceService, TencentCloudType} from "./provider.ts";
import {Project} from "@qpa/core";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";


import {ClientConfig as tc_ClientConfig} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";

interface TencentCloudProps {
  credential: TencentCloudCredential
}

/**
 * 总的腾讯云工厂入口
 *
 * @public
 */
export class TencentCloud implements _TencentCloudAware {
  private readonly _credential: TencentCloudCredential;
  readonly _provider: TencentCloudProvider;
  readonly _services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> =new Map();

  tagClient: tc_TagClient;

  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(readonly _project: Project, props: TencentCloudProps) {
    this._credential = props.credential;

    this.tagClient = new tc_TagClient({
      credential: this._credential,
    });


    const add=(service: TencentCloudResourceService<unknown, unknown>)=>{
      this._services.set(service.resourceType, service);
    }

    // vpc
    this.vpc = new VpcFactory(this);
    add(new VpcService(_project, this.vpc));
    add(new SubnetService(_project, this.vpc));

    // cvm
    this.cvm = new CvmFactory(this);
    add(new CvmInstanceService(_project, this.cvm));


    // assert services register
    for (const type of TencentCloudType.types) {
      if (!this._services.has(type)) {
        throw Error(`bug:assert qpa internal bug,ResourceType ${type} 未注册相应的ResourceService`)
      }
    }

    this._provider = new TencentCloudProvider(_project, this);
    //放到最后执行，避免因构造check失败而抛出异常，但却把this加入到{@link Project.providers | 提供者集合} 中
    _project.registerProvider(this._provider);
  }

  public _getClientConfigByRegion(region: string): tc_ClientConfig {
    return {
      credential: this._credential,
      region: region,
    }
  }
}

