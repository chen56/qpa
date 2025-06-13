import {VpcFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {_TencentCloudAware, TencentCloudCredential, _TencentCloudProvider, _TencentCloudResourceService, TencentCloudType, _TencentCloud} from "./provider.ts";
import {Project} from "@qpa/core";
import {SubnetService} from "./vpc/subnet.ts";
import {CvmInstanceService} from "./cvm/instance.ts";
import {CvmFactory} from "./cvm/factory.ts";


import {ClientConfig as tc_ClientConfig} from "tencentcloud-sdk-nodejs/tencentcloud/common/interface.js";
import {Client as tc_TagClient} from "tencentcloud-sdk-nodejs/tencentcloud/services/tag/v20180813/tag_client.js";
import {TagService} from "./internal/_tag_service.ts";

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
  readonly _provider: _TencentCloudProvider;


  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;
  readonly _internal: _TencentCloud;

  constructor(readonly _project: Project, props: TencentCloudProps) {

    this._credential = props.credential;

    const services: Map<TencentCloudType, _TencentCloudResourceService<unknown, unknown>> = new Map();

    const add = (service: _TencentCloudResourceService<unknown, unknown>) => {
      services.set(service.resourceType, service);
    }

    // vpc
    this.vpc = new VpcFactory(this);
    add(new VpcService(_project, this.vpc));
    add(new SubnetService(_project, this.vpc));

    // cvm
    this.cvm = new CvmFactory(this);
    add(new CvmInstanceService(_project, this.cvm));

    // assert services register
    for (const [_, type] of TencentCloudType.types) {
      if (!services.has(type)) {
        throw Error(`bug:assert qpa internal bug,ResourceType ${type} 未注册相应的ResourceService`)
      }
    }

    const tagClient = new tc_TagClient({
      credential: this._credential,
    });

    let tagService = new TagService(_project, tagClient, services);
    this._provider = new _TencentCloudProvider(tagService, services);
    //todo 这里的设计有点诡异，依赖执行顺序？
    // 放到最后执行，避免因构造check失败而抛出异常，但却把this加入到{@link Project.providers | 提供者集合} 中
    _project.registerProvider(this._provider);

    this._internal = new _TencentCloud(_project, this._provider, props.credential);
  }

  public _getClientConfigByRegion(region: string): tc_ClientConfig {
    return {
      credential: this._credential,
      region: region,
    }
  }
}

