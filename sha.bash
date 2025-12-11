#!/usr/bin/env bash
# shellcheck disable=SC2317
set -o errtrace  # -E trap inherited in sub script
set -o errexit   # -e
set -o functrace # -T If set, any trap on DEBUG and RETURN are inherited by shell functions
set -o pipefail  # default pipeline status==last command status, If set, status=any command fail

## 开启globstar模式，允许使用**匹配所有子目录,bash4特性，默认是关闭的
shopt -s globstar

CLI_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$CLI_DIR"

# shellcheck disable=SC1091
source "./common.bash"

# 按项目组复用command
_load_nodejs_group_defaults


##########################################
# app cmd script
# 独立于项目组的特殊命令
##########################################
info() {
  echo "## workspaces:"
  # shellcheck disable=SC2154
  printf "  %s\n" "${__all_workspaces[@]}"
  echo "## packages:"
#  printf "  %s\n" "$(_dir_to_package_name "${__all_workspaces[@]}")"
#  echo "## out ip:"
#  echo "  $(curl ipinfo.io/ip 2>/dev/null)"
}


analyze() {
    deps() {
        ./shb clean
        # 有点复杂，找个
        mkdir -p build/depcruise
        _build_depcruise() {
            local workspace_name="$1"
    #        _run depcruise --output-type mermaid . > build/depcruise.mermaid
            _run depcruise --metrics --include-only "packages/$workspace_name" --output-type dot . > "build/depcruise/depcruise.$workspace_name.include-only.dot"
            _run depcruise --metrics --focus        "packages/$workspace_name" --output-type dot . > "build/depcruise/depcruise.$workspace_name.focus.dot"
            _run depcruise --metrics --reaches        "packages/$workspace_name" --output-type dot . > "build/depcruise/depcruise.$workspace_name.reaches.dot"
        }
        _build_depcruise core
        _build_depcruise provier-tencentcloud
    }
}

##########################################
# app 入口
##########################################
# 守卫语句，本脚本如果作为lib导入使用则不再执行后续命令入口代码
# - 当本脚本作为命令被执行时'$ ./sha.bash', $0为'./sha.bash,
# - 当本脚本当作类库导入时即: '. ./sha.bash'，$0值为bash/zsh等
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

# 命令式执行的入口代码, 即'$ ./sha.bash' 而不是'. ./sha.bash'
sha "$@"
