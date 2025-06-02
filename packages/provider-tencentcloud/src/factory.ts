import {VpcFactory, VpcLazyFactory} from "./vpc/factory.ts";
import {VpcService} from "./vpc/vpc.ts";
import {_TencentCloudAware, TencentCloudCredential, TencentCloudProvider, TencentCloudResourceService, TencentCloudType} from "./provider.ts";
import {LazyProject, Project} from "@qpa/core";
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

  tagClient: tc_TagClient;

  readonly vpc: VpcFactory;
  readonly cvm: CvmFactory;

  constructor(readonly _project: Project, props: TencentCloudProps) {
    this._credential = props.credential;

    this.tagClient = new tc_TagClient({
      credential: this._credential,
    });

    const services: Map<TencentCloudType, TencentCloudResourceService<unknown, unknown>> = new Map();

    function add(service: TencentCloudResourceService<unknown, unknown>) {
      services.set(service.resourceType, service);
    }

    // vpc
    this.vpc = new VpcFactory(this);
    add(new VpcService(_project, this.vpc));
    add(new SubnetService(_project, this.vpc));

    // cvm
    this.cvm = new CvmFactory(this);
    add(new CvmInstanceService(_project, this.cvm));

    this._provider = new TencentCloudProvider(_project, this, {
      services: services,
    });
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


/**
 * @public
 */
export class LazyModeTencentCloudFactory {
  readonly vpc: VpcLazyFactory;

  constructor(readonly project: LazyProject, readonly provider: TencentCloudProvider) {
    this.vpc = new VpcLazyFactory(this.project, this.provider);
  }
}
