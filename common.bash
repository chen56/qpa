#!/usr/bin/env bash
set -o errtrace  # -E trap inherited in sub script
set -o errexit   # -e
set -o functrace # -T If set, any trap on DEBUG and RETURN are inherited by shell functions
set -o pipefail  # default pipeline status==last command status, If set, status=any command fail

# nullglob选项默认off时：
# -------------------------.bash
# bash-5.2$ a=(./no_exists_dir/*/sha)
# bash-5.2$ declare -p a
# declare -a a=([0]="./no_exists_dir/*/sha")
# -------------------------
# 没有匹配到任何文件时，包含字符串字面量，这不是我们要的
#
# 而打开nullglob后：
# -------------------------.bash
# shopt -s nullglob
# bash-5.2$ a=(./no_exists_dir/*/sha)
# bash-5.2$ declare -p a
# declare -a a=()
# -------------------------s
# 空数组!这是我们想要的
shopt -s nullglob

# On Mac OS, readlink -f doesn't work, so use._real_path get the real path of the file
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

install_sha() (
  mkdir -p "$ROOT_DIR/vendor"
  set -x
  curl -L -o "$ROOT_DIR/vendor/sha.bash" https://github.com/chen56/sha/raw/main/sha.bash
)

if ! [[ -f "$ROOT_DIR/vendor/sha.bash" ]]; then
  install_sha
fi

# 注意，当前import sha.bash前不能定义任何函数，否则会被认为是系统函数，注册时会因为
# shellcheck disable=SC1091
. "$ROOT_DIR/vendor/sha.bash"


# 清晰的函数调用日志，替代 `set -x` 功能
#
# Usage:   _run <some cmd>
# Example: _run docker compose up
#
# 假设你的./sake 脚本里有个函数： 
# up() { 
#   _run docker compose up;  # ./sake 的 22行
# } 
# 运行`./sake up`后打印日志：
# 🔵 ./sake:22 up() ▶︎【/home/ubuntu/current_work_dir$ docker compose up】
# 你可以清晰的看到: 
#   - 在脚本的哪一行: ./sake:22
#   - 哪个函数: up()
#   - 在哪个工作目录: /home/ubuntu/current_work_dir
#   - 执行了什么: docker compose up
# 在vscode中，按住macbook的cmd键,点终端上输出的‘./sake:106’, 可以让编辑器跳转到对应的脚本行，很方便
# 获取调用栈的原理：
#   `caller 0`输出为`22 foo ./sake`，即调用_run函数的调用栈信息：行号、函数,脚本
_run() {
  caller_script=$(caller 0 | awk '{print $3}')
  caller_line=$(caller 0 | awk '{print $1}')

  # 把 /home/ubuntu/current_work_dir 替换为 ~/current_work_dir 短格式
  # 使用 @ 作为分隔符，避免与路径中的 / 冲突
  # shellcheck disable=SC2001
  show_pwd=$(echo "$PWD" | sed "s@^$HOME@~@" )

  echo "  🔵$caller_script:$caller_line ${FUNCNAME[1]}() ▶︎【$show_pwd$ $*】" >&2
  "$@"
}

# 正常化路径
# Usage: normal_path <path>
# Examples:
# $ normal_path './'
# .
# $ normal_path './a'
# a
# $ normal_path './a/'
# a
# $ normal_path './a/'
# ./a
# $ normal_path '/'
# /
_normal_path() {
  if [[ "${1}" == "/" ]]; then
    echo $1
  else
    echo "${1%/}"
  fi
}

#_npm_project() {
#
#}

# 打开npm命令组
_project_group_pnpm_on() {
  clean() { _run rm -rf build dist out node_modules;}
  test() { _run vitest run;}
  install() { _run pnpm install; build;  }
  build() {
        mkdir -p ./dist
    #    _run npx tsc --noEmit
        _run bun build --root ./src --outdir=./dist --sourcemap=linked --format=esm --target=node --entry-as-name src/index.ts

#    npm install --save-dev esbuild

        # 构建 Composite 项目 (带有 references 时推荐): tsc --build 或 tsc -b。这是用于协调 Monorepo 中 Composite 项目构建的命令。
        # 它会读取 tsconfig.json 并根据 composite 和 references 来决定做什么（包括检查依赖、使用 .tsbuildinfo、生成 .js 和/或 .d.ts）。
        # 这是在 Monorepo 中构建子项目的推荐命令。
        _run  pnpm exec  tsc --build  ./tsconfig.build.json

        _run bun pm pack --destination=./build/
        _run tar -xzf ./build/*.tgz -C "./build"
  }
  pack() {
        build

        _run bun pm pack --destination=./build/
        _run tar -xzf ./build/*.tgz -C "./build"
  }

  info() { _run echo "cli: out ip: $(curl ipinfo.io/ip 2>/dev/null)"; }
  main() {  _run pnpm exec tsx src/index.ts "$@" || printf "%b\n" "------------------\n run src/index.ts, exit code($?)" ;}
}
