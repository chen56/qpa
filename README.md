# bake

纯bash项目，用于父子命令，option能力，类似于dart的args库。

```bash

# bake == (bash)ake == 去Make的bash tool
#
# https://github.com/chen56/bake
#
# bake 是个简单的命令行工具，以替代Makefile的子命令功能
# make工具的主要特点是处理文件依赖进行增量编译，但flutter、golang、java、js项目的build工具
# 太厉害了，这几年唯一还在用Makefile的理由就是他的子命令机制: "make build"、
# "make run", 可以方便的自定义单一入口的父子命令，但Makefile本身的语法套路也很复杂，
# 很多批处理还是要靠bash, 这就尴尬了，工具太多，麻烦！本脚本尝试彻底摆脱使用Makefile。
# 经尝试，代码很少啊 ，核心代码几百行啊，父子命令二三百行左右，option解析二三百行左右，功能足够了：
#
# bake命令规则：
# 1. 函数即命令，所有bake内的函数均可以在脚本外运行：
#      ./bake [all function]     # bake内的所有函数均可以在脚本外直接运行
#      ./bake info               # 比如这个内部函数, 看bake内部变量，调试脚本用
#      ./bake test               # 你如果定义过test()函数，就可以这样运行
# 2. 带"."的函数，形成父子命令:
#    web.build(){ echo "build web app"; }
#    web.test(){ echo "build web app"; }
#   可以这样调用
#      ./bake web -h            # 运行子命令,或看帮助
#      ./bake web.build -h      # 上面等同
#      ./bake web test -h       # 运行子命令,或看帮助
#      ./bake web.test -h       # 与上面等同
# 3. 特殊的root命令表示根命令
#      ./bake                   # 如果有root()函数，就执行它
# 4. 像其他高级语言的cli工具一样，用简单变量就可以获取命令option:
#    # a. 先在bake文件里里定义app options
#      bake.opt --cmd build --long "target" --type string
#    # b. 解析和使用option
#      function build() {
#         eval "$(bake.parse  "$@")";
#         echo "build ... your option：target: $target";
#      }
#    # c. 调用看看:
#      ./bake build --target "macos"
# 5. bake尽量不依赖bash以外的其他工具，包括linux coreutils,更简单通用,但由于用了关联数组等
#    依赖bash4+
# 6. 有两种用法：
#     - 这个文件copy走，把你的脚本放到本脚本最后即可.
#     - 在你的脚本里直接curl下载本脚本后 source即可。
# 范例可以看实际案例：
#     - https://github.com/chen56/you/blob/main/bake


# TODO
#   1. 当前 无法判断错误命令：./bake no_this_cmd ,因为不知道这是否是此命令的参数，
#      需要设置设一个简单的规则：只有叶子命令才能正常执行，这样非叶子命令就不需要有参数
#   2. 当前 无法判断错误options：./bake --no_this_opt ,同上
#   3. 类似flutter run [no-]pub 反向选项
# TODO
#   利用extdebug , declare -F xxx 可显示行号，这下顺序解决了！
#  https://www.gnu.org/software/bash/manual/bash.html#The-Shopt-Builtin
#


```

## 范例

首先建立一个空脚本文件，可以叫bake，复制下面代码进去：

```bash
#!/usr/bin/env bash

# 我们都知道bash没什么有效的包管理工具，但没关系，curl就是包管理工具，在你的脚本复制下面模版
# 脚本动态安装bake.bash依赖到: vendor/bake.bash
if ! [[ -f "./vendor/bake.bash" ]]; then
  mkdir -p "./vendor"
  curl -L -o  "./vendor/bake.bash" https://github.com/chen56/bake/raw/main/bake.bash ;
fi
source "./vendor/bake.bash"

# 定义一些二级命令
install(){         echo "install deps"; }
clean(){           echo "clean project"; }
dev(){             echo "run dev mode"; }
preview(){         echo "run preview mode"; }
test(){            echo "test project"; }

# 更深层的命令: `./bake build -h` , `./bake build all`
build.all(){       echo "build all"; }
build.macos(){     echo "build macos package"; }
build.web(){       echo "build web package"; }
build.android(){   echo "build android package"; }
build.ios(){       echo "build ios package"; }

# bake走起
bake.go "$@"
```

运行 `chmod +x ./bake ` 再运行它：`./bake -h` ,你会看到bake已经帮你组织好了子命令，就像docker/git等父子命令一样使用：

```bash
$ ./bake

Available Options:
 --debug                -d  bool   required:[false] debug mode, print more internal info
 --help                 -h  bool   required:[false] print help, show all commands

Available Commands:
  build
  clean
  dev
  install
  preview
  test
```

查看更多范例：[examples](./examples)

# TODO

- 去掉cmd的type概念，取到多个值就放到数组里
- 准备v2版
  - 改组api 比如 @cmd @opt 这种类似元数据的模式
  - 重新实现更高效简单的内部数据结构，不用树了，复杂性有点高，就普通数组
  - 重新对齐 概念：命令、普通函数、内部函数等 确定到底是用下划线还是啥
    - 命令就是普通函数，只是会在命令列表里出现，可以通过 ignore_prefix=('@' '_' _'fn__') 前缀的方式把不想进入命令列表的函数圈出去
  - 改名sake
  - x.x 这种层级结构是不是有点难理解，是不是嵌套函数更好？
  - root命令的问题需要再确认
  - 错误码需要梳理
  - __go_parse 还有必要存在吗？bake内部都加上前缀是不是就可以了
  - 用 `exec "$@"` 执行目标命令
  - @cmd 这种没参数的标出下面一个函数是cmd？这样不知道能实现不

## bug

- help ./bake 执行后提示的路径不对：Running:【: ~/git/xxx/bake.bash 】，应该是 ~/git/xxx/bake
