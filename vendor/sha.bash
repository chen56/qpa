#!/usr/bin/env bash
set -o errtrace  # -E trap inherited in sub script
set -o errexit   # -e
set -o functrace # -T If set, any trap on DEBUG and RETURN are inherited by shell functions
set -o pipefail  # default pipeline status==last command status, If set, status=any command fail
#set -o nounset # -u: 当尝试使用未定义的变量时，立即报错并退出脚本。这有助于防止因变量拼写错误或未初始化导致的意外行为。
                #  don't use it ,it is crazy, 
                #   1.bash version is diff Behavior 
                #   2.we need like this: ${arr[@]+"${arr[@]}"}
                #   3.影响使用此lib的脚本
           
_sha_real_path() {  [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}" ; }

# 所有找到的子命令列表，不清理，用于每次注册子命令时判断是否为新命令，key是函数名，value是函数内容
declare -A _sha_all_registerd_cmds
# 当前命令子命令列表,每次进入新的命令层级，会清空置换为当前命令的children，key是函数名，value是函数内容
declare -A _sha_current_cmd_children
# 当前命令链, 比如执行docker container ls时，解析到最后一个ls时的命令链是：_sha_cmd_chain=(docker container ls)
declare _sha_cmd_chain=()
declare _sha_cmd_exclude=("_*" "fn_*" "sha") # 示例前缀数组

# replace $HOME with "~"
# Usage: _sha_pwd <path>
# Examples:  
#  _sha_pwd "/home/chen/git/note/"
#         ===> "~/git/note/"
_sha_pwd() {
  local _path="$1"
  printf "%s" "${_path/#$HOME/\~}" ; 
}

# Usage: _sha_log <log_level> <msg...>
# Examples: 
#   _sha_log ERROR "错误消息"
#
# log_level: DEBUG|INFO|ERROR|FATAL
_sha_log(){
  local level="$1"
  echo -e "$level $(date "+%F %T") $(_sha_pwd "$PWD")\$ ${func_name[1]}() : $*" >&2
}

_sha_on_error() {
  local last_command="$BASH_COMMAND" # Bash 特有变量，显示出错的命令
  echo  "ERROR: 命令 '$last_command' 执行失败, trapped an error:, trace: ↓" 1>&2
  local i=0
  local stackInfo
  while true; do
    stackInfo=$(caller $i 2>&1 && true) && true
    if [[ $? != 0 ]]; then return 0; fi

    # 一行调用栈 '97 bake.build ./note/bake'
    #    解析后 =>  行号no=97 , 报错的函数func=bake.build , file=./note/bake
    local no func file
    IFS=' ' read -r no func file <<<"$stackInfo"

    # 打印出可读性强的信息:
    #    => ./note/bake:38 -> bake.build
    printf "%s\n" "$(_sha_real_path $file):$no -> $func" >&2

    i=$((i + 1))
  done
}

# 关联数组不像普通数组那样可以: a=() 清理，所以需要自己清理
# Usage: _sha_clear_associative_array <array_name>
_sha_clear_associative_array() {
    # --- 参数及错误检查 ---

    # 检查是否提供了恰好一个参数 (关联数组的名称)
    if [ "$#" -ne 1 ]; then
        echo "用法: ${func_name[0]} <关联数组名称>" >&2 # ${func_name[0]} 获取当前函数名
        echo "示例: ${func_name[0]} my_data_array" >&2
        return 1
    fi

    local array_name="$1" # 从第一个参数获取关联数组的名称

    # 使用 'declare -n' 创建一个名称引用 (nameref)
    # 这使得 'arr_ref' 成为一个指向由 $array_name 指定的实际关联数组的别名
    # 对 arr_ref 的任何操作都会直接作用于原始关联数组
    # requires Bash 4.3+
    declare -n arr_ref="$array_name"

    # 检查由 $array_name 指定的变量是否存在且是否确实是一个关联数组
    # declare -p 会打印变量的属性，grep -q 检查输出是否包含 "declare -A"
    # 2>/dev/null 忽略当变量不存在时 declare -p 可能输出的错误信息
    if ! declare -p "$array_name" 2>/dev/null | grep -q "declare -A"; then
         echo "错误: 变量 '$array_name' 不存在或不是一个已声明的关联数组。" >&2
         return 1
    fi

    # 获取数组的所有键的列表，并循环遍历
    # "${!arr_ref[@]}" 通过名称引用获取原始关联数组的所有键
    for key in "${!arr_ref[@]}"; do
        # 使用 unset 命令删除当前键对应的元素
        # "arr_ref["$key"]" 通过名称引用访问原始关联数组的元素
        unset 'arr_ref["$key"]'
    done
}

# 函数：获取当前子命令集合，并使用指定的分隔符连接输出。
# Usage: _sha_cmd_get_children [delimiter:\n]
# delimiter (可选): 用于连接命令字符串的分隔符, 如果未提供，默认使用换行符。
# 输出: 连接后的命令字符串集合到标准输出。
_sha_cmd_get_children() {
    local delimiter=${1:-'\n'} # 声明局部变量用于存储分隔符

    # --- 使用分隔符连接并输出 ---
    # 使用子 Shell 和 IFS 来临时改变字段分隔符
    # 子Shell不会污染当前 Shell 环境 IFS 的方法
    (
        # 设置 IFS 为确定的分隔符
        IFS="$delimiter"
        # 使用 "${_sha_current_cmd_children[*]}" 扩展数组的所有元素，并用 IFS 的第一个字符连接它们
        echo "${_sha_current_cmd_children[*]}"
    ) 
}

# Usage: _sha_register_children_cmds <cmd_level>
# ensure all cmd register
# root cmd_level is "/"
_sha_register_children_cmds() {
  local next_cmd="$1"

  _sha_cmd_chain+=("$next_cmd")

  # 每次清空，避免重复注册，目前的简化模型，只注册当前层级命令，不注册子命令
  declare -A new_children
  local func_name func_content
  while IFS=$'\n' read -r func_name; do

    # check func_name
    case "$func_name" in
        */*)  _sha_log ERROR "function name $func_name() can not contains '/' " >&2
              return 1 ;;
        # 添加其他想处理的函数名
    esac

    func_content=$(declare -f "$func_name")
    
    # 新增的cmd才是下一级的cmd
    # 父节点的子命令中可能和当前节点子命令同名
    # 判断依据为：只要当前节点识别出的函数与老的不同即认为是当前节点的子命令：
    # 1. 父节点没有注册过的
    # 2. 父节点注册过同名的，但内容不一样的
    if [[ "${_sha_all_registerd_cmds["$func_name"]}" == "$func_content"  ]]; then
      continue;
    fi
    
    # 排除掉某些前缀
    local exclude
    local is_excluded=false
    for exclude in "${_sha_cmd_exclude[@]}" ;do
      # 只要匹配一个非cmd前缀，就不注册cmd
      # shellcheck disable=SC2053
      # glob匹配
      if [[ "$func_name" = $exclude ]]; then
        is_excluded=true
        break;
      fi
    done

    if $is_excluded ; then
       continue 
    fi

    new_children["$func_name"]="$func_content"

  # 获取所有函数名输入到while循环里
  # < <(...) 将管道 compgen -A function 的输出作为 while read 的标准输入
  # compgen -A function比declare -F都是bash的内置函数，但declare -F在各版本间输出有变化所以不用
  done < <(compgen -A function)

  # 填充为下一级命令列表
  # 设置下一级的命令列表前先清空上一级列表
  _sha_clear_associative_array _sha_current_cmd_children
  # "${!new_children[@]}" 会扩展为关联数组的所有键的列表
  for key in "${!new_children[@]}"; do
      _sha_all_registerd_cmds["$key"]="${new_children["$key"]}"
      _sha_current_cmd_children["$key"]="${new_children["$key"]}"
  done  

}

_sha_help() {
  echo "###########################"
  echo "## she help"
  echo "###########################"
  for key in "${!_sha_current_cmd_children[@]}"; do
      echo "[$key]"
  done  
}

# cmd  (public api)
# 注册一个命令的帮助信息
# Examples:
#   cmd "sha [options] " --desc "build project"
# 尤其是可以配置root命令以定制根命令的帮助信息，比如:
#   cmd --cmd root \
#             --desc "flutter-note cli."
# 这样就可以用'./your_script -h' 查看根帮助了
# cmd() {
#   local __cmd="$1" __desc="$2"

#   if [[ "$__cmd" == "" ]]; then
#     echo "error, please: @cmd <cmd> [description] " >&2
#     return 1
#   fi
# }


_sha_is_leaf_cmd() {
  if [[ "${#_sha_current_cmd_children[@]}" == "0" ]]; then
    return 0;
  fi
  return 1;
}




_sha() {
  local cmd="$1"
  # echo "_sha(): args:[$*] , current_cmds:[${_sha_all_registerd_cmds[*]}]"
  shift

  # 非法命令
  if [[  "${_sha_current_cmd_children[$cmd]}" == "" ]]; then
    echo  "ERROR: unknown command $cmd, 请使用 './sha --help' 查看可用的命令。 "
    exit 1;
  fi
  
  # 执行当前命令后，再注册当前命令的子命令
  "$cmd" "$@"
  _sha_register_children_cmds "$cmd"

  # 根命令本身就是leaf，返回即可
  if _sha_is_leaf_cmd; then
    return 0;
  fi

  # not leaf cmd, no args, help
  if (( $#==0 )); then
    _sha_help
    echo "请使用子命令, 例如: ./sha <cmd> [args]"
    exit 3;
  fi

  # 后面还有参数,递归处理
  _sha "$@"
}

sha() {
  _sha_register_children_cmds "/"

  # 根命令本身就是leaf，返回即可
  if _sha_is_leaf_cmd; then
    return 0;
  fi

  # not leaf cmd, no args, help
  if (( $#==0 )); then
    _sha_help
    echo "请使用子命令, 例如: ./sha <cmd> [args]"
    exit 3;
  fi
  # not leaf cmd, has args, process args
  _sha "$@"
}

#######################################
## 入口
#######################################
trap "_sha_on_error" ERR
