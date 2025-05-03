# exec

`exec` 的作用是 **用指定的命令替换当前进程** ，不再保留原 shell 进程。

* 语法：`exec command [args...]`
* 常用于脚本结尾，把脚本进程变成目标命令进程。
* 在 Docker 容器入口脚本中用 `exec "$@"` 可以让容器正确响应信号（如 Ctrl+C、SIGTERM）。
  * 参考: <https://github.com/bitnami/containers/blob/main/bitnami/nginx/1.27/debian-12/rootfs/opt/bitnami/scripts/nginx/entrypoint.sh%E2%80%B8>

**简单理解：**
`exec` 后面跟的命令会“顶替”当前 shell 进程，后面的脚本不会再执行。

## 范例

```
$ ./main.bash
main.bash PID： 44929
b.bash PID： 44929
```
