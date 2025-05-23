# qpa

terraform是个nb的项目，但使用过程中，有些问题无法克服，遂开发此项目。

需求：

- 主要用于测试云部署方案的用途，所以
  - 只提供一些主流云的网络、虚拟机等核心组件，够用即可，主要能部署常见的程序栈，ai栈，主要是简单好重建资源。
  - 暂时不考虑资源修改，一律重建，减少复杂性。
- 以lib方式供其他项目引用，而不是像terraform一样的命令行工具。
- 提供简单的api接口，可以快速实现自定义资源，比如只重建不修改的资源代码，其实很少，很简单。
- 基于Typescript的配置，ide支持很好，让配置型项目更容易维护，本来配置型项目，里面会有一些逻辑，hcl配置很快会演变为一种脚本语言维护困难。
  - tfcdk、pulumi本质是golang的命令行工具，而我曾尝试封装，但难度有点高，遂放弃。
- 无状态配置，本地不像terraform一样维护配置状态，而用tag方式直接在云资源本身上标记，这样就从根本上减少多数据源事务不一致问题。
  - 比如截止2025年4月，我在使用腾讯云terraform时，仍然在核心资源cvm上会丢资源，脚本执行失败，但资源实际已在云上建立，而本地丢失状态。
- 提供2种使用方式
  - 过程性/命令式的配置，很多中小配置项目，或实验项目，都需要直接简单的配置，而且过程型配置是可以逐行调试，生成一个资源，看看效果，再执行一行，再生成一个资源。
  - 类似于terraform复杂依赖关系的DAG图的配置，基于图的依赖模式，可以让资源子树独立重建，而命令式的配置，是线性的，只能按顺序线性重建。
