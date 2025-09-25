# @qpa/core

## IOC工具核心概念定义

本节内容为较完整的IOC工具核心概念定义，QPA目前倾向于轻量级的IaC工具，只支持重建，而不支持比较更新，只选用少量概念。

从资源声明角度看:

- **非托管资源(Unmanaged Resources):** 未被 IaC 工具管理的外部资源。
	- **正常非托管资源（Normal Unmanaged Resources）** 手工管理、脱离IaC 管理的资源实例。
	- **孤立资源（Orphaned Resources）** 因各种原因由IaC创建，云环境中依然存在，但已经不再受任何 IaC 工具管理和识别的资源实例。
- **托管资源(Managed Resources):** 由 IaC 工具负责管理生命周期的资源。
	- **声明资源(Declared Resources) / 期望状态(Desired State):** IaC 配置代码中定义的资源。
		- **待创建资源(Pending Creation Resources):** 已在配置中声明，但尚未在云端创建的资源实例。
		- **已部署资源(Provisioned Resources):** 已在配置中声明，并且已成功在云端创建并存在的资源实例。
			- **一致资源(In-Sync Resources):** 已部署资源实例的实际状态与声明的期望状态完全一致。
			- **漂移资源(Drifted Resources):** 已部署资源实例的实际状态与声明的期望状态不一致。
				- **属性漂移资源(Attribute Drift Resources):** 资源实例的某些属性与配置中声明的不符。
				- **重复/冲突资源(Duplicate/Conflicting Resources):** 由于重复创建等故障导致存在多个实际资源实例与同一份声明对应。
			- 故障忽略资源 (Failed Ignore Resources)：因云 API 临时故障或依赖未解决，无法执行操作的资源，标记为忽略后暂不处理，故障修复后可恢复管理。
			- 强制锁定资源 (Locked Resources)：禁止修改 / 删除的资源，需手工解除锁定后才能管理（如 AWS EC2 实例的 Termination Protection）。
	- **已解除声明资源(Undeclared Resources):** 曾被 IaC 配置声明，但已从当前配置中移除的资源，云端实例待清理。

从资源实例角度看:

- **实际的云上资源实例(Resource Instance) / 实际状态(Actual State):** 统括所有在云环境中真实存在的资源实例，包括：
	- **非托管实例(Unmanaged Instances):** 那些在云上存在但从未被当前 IaC 配置声明或管理的资源实例（即“非托管资源”的实际体现）。
    - **正常非托管资源（Normal Unmanaged Instances）** 手工管理、脱离IaC 管理的资源实例。
    - **孤立资源（Orphaned Instances）** 因各种原因由IaC创建，云环境中依然存在，但已经不再受任何 IaC 工具管理和识别的资源实例。
  - **托管实例(Managed Instances):** 由 IaC 工具负责管理生命周期的资源。
    - **一致资源实例(In-Sync Instances):** 其状态与 IaC 声明的期望状态匹配的实际资源实例。
    - **漂移资源实例(Drifted Resources):** 其状态与 IaC 声明的期望状态不一致的实际资源实例，可能表现为：
      - **属性差异(Attribute Differences Instances):** 实际属性值与声明不符。
      - **重复创建(Duplicate Instances):** 存在多个与同一份声明对应的实际资源实例。
    - **故障忽略资源** (Failed Ignore Resources)：因云 API 临时故障或依赖未解决，无法执行操作的资源，标记为忽略后暂不处理，故障修复后可恢复管理。
    - **强制锁定资源** (Locked Resources)：禁止修改 / 删除的资源，需手工解除锁定后才能管理（如 AWS EC2 实例的 Termination Protection）。
    - **待删除资源(Pending Deletion Instances):** 配置已移除，等待工具删除（工具计划内）。
+ 待创建资源(Expected Instances) : 配置中声明但未实例化的资源（无实例）


### 状态

状态(State)

- 实际状态 (Actual State)
- 期望状态（Desired State）

Actual Resources: 云平台上真实存在的资源（无论是否被 IaC 工具管理）。 Actual/Created Resources

资源管理范围/边界(Managed Resource Scope):  QPA项目不存本地状态，只用云上的Tag等技术来圈定管理范围。

已存在资源(Existing Resources)的服务状态

#### 详细状态

Active

- 启动中(Starting)
- 运行中(Running)
- 停止中(Stopping)
- 已停止(Stopped)

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

### 执行计划

Execution Plan (执行计划)，详细列出将要

- create (创建)
- update-in-place (原地更新)
- replace (销毁重建)
- delete (销毁) 的资源

### 同义词

- Declared候选词汇
	- Planned
	- Configured/Unconfigured
- Provision候选词汇
	- Created/Active
	- Ready: Kubernetes Ready 状态表示 Pod 或 Service 已就绪，类似 provisioned 的含义。
- Pending Deletion Resources
	- Orphaned/Ghost Resources（孤立/幽灵资源），有异议，有人解释为无法删除的资源，即iac工具已无法跟踪的资源

## QPA 过程式配置的概念裁剪


