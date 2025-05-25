# @qpa/core

## 资源的核心状态

主流 IAC 工具（Terraform、AWS CloudFormation、Azure ARM/Terraform、Google Cloud Deployment Manager）

IAC(Infrastructure as Code)角度看，Resource有以下概念：

### 资源定义

资源(Resource):

- 非托管资源(Unmanaged Resources) : 未被IAC工具管理的外部资源
- 托管资源(Managed Resources) : 由IAC工具管理的资源
  - 声明资源(Declared Resources) : 配置代码中定义的资源(期望状态)
    - 待创建资源(Pending Provision Resources) : 已声明但未创建的资源
    - 已创建资源(Provisioned Resources) : 已声明且成功创建的资源
      - 一致资源(In-Sync Resources) : 期望状态与实际状态一致
      - 漂移资源(Drifted Resources) : 期望状态与实际状态不一致
        - 属性有差异的资源(Differing Resources) : 配置中声明的属性与实际状态不一致的资源
		- 重复资源(): 出现重复创建故障的多个实际资源
  - 已解除声明资源(Undeclared Resources) : 曾声明但已从配置中移除的资源
    - 待删除资源（Pending Deletion Resources）
  - 忽略资源(ignore resource) ,比如配置中已删除，但无法成功删除的实际资源，可以暂时标记为ignore

### 其他名词

状态(State)
- 实际状态 (Actual State) 
- 期望状态（Desired State）

Actual Resources: 云平台上真实存在的资源（无论是否被 IaC 工具管理）。	Actual/Created Resources

资源管理范围/边界(Managed Resource Scope):  QPA项目不存本地状态，只用云上的Tag等技术来圈定管理范围。


### 详细状态

Provision
- Provisioning: "Resource is provisioning..."（资源正在部署中）
- Provisioned: "Resource has been provisioned"（资源已部署完成）
- Provisioning Failed: "Resource provisioning failed due to network error"（资源部署因网络错误失败）
- Deprovisioned : "Resource has been deprovisioned"（资源已被删除）

Deletion
* Pending Deletion
* Deleting
* Deleting Failed
* Deleted

通用行为过程：
* Pending something
* Doing something
* Doing something Failed
* Done something


### 同义词

- Declared候选词汇
	- Planned
	- Configured/Unconfigured
- Provision候选词汇
	- Created/Active
    - Ready: Kubernetes Ready 状态表示 Pod 或 Service 已就绪，类似 provisioned 的含义。
- Pending Deletion Resources
	- Orphaned/Ghost Resources（孤立/幽灵资源），有异议，有人解释为无法删除的资源，即iac工具已无法跟踪的资源

