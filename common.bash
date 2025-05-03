#!/usr/bin/env bash
set -o errtrace  # -E trap inherited in sub script
set -o errexit   # -e
set -o functrace # -T If set, any trap on DEBUG and RETURN are inherited by shell functions
set -o pipefail  # default pipeline status==last command status, If set, status=any command fail

# On Mac OS, readlink -f doesn't work, so use._real_path get the real path of the file
_ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
_ROOT_SAKE_PATH="${_ROOT_DIR}/bake"



upgrade_bake() {
  mkdir -p "$_ROOT_DIR/vendor"
  echo "$_ROOT_SAKE_PATH -> upgrade_bake ▶︎【 curl -o $_ROOT_DIR/bake.bash https://github.com/chen56/bake/raw/main/bake.bash 】"
  curl -L -o "$_ROOT_DIR/vendor/bake.bash" https://github.com/chen56/bake/raw/main/bake.bash
}
if ! [[ -f "$_ROOT_DIR/vendor/bake.bash" ]]; then
  upgrade_bake
fi

# shellcheck disable=SC1091
. "$_ROOT_DIR/vendor/bake.bash"


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

  echo "🔵 $caller_script:$caller_line ${FUNCNAME[1]}() ▶︎【$show_pwd$ $*】" >&2
  "$@"
}

