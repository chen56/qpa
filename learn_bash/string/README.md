```bash

# bash 字符串

shell 就是靠解析字符串过日子的，命令的分割、参数的传递、变量的替换、条件判断、循环、函数调用处处离不开字符串。理解了shell如何对待字符串，才理解shell如何工作。

## \0

\0是ASCII 码为 0的字符，也叫null字符。

### \0是什么

C 语言字符串以 `\0` 结尾，表示字符串终止。例如：`char s[] = "abc";` 实际上是 `{'a','b','c','\0'}`。

### \0能做什么

在 shell 中，`\0` 不是常规文本字符，而是用来分隔数据的特殊字节。比如find命令默认用换行符分割文件名，但文件名是允许换行符的，会产生解析问题，加-print0选项后改用`\0`分割，如下：

```b
find .
.
./README.md
./zero.bash

find . -print0
../README.md./zero.bash
```

用od命令让`\0`现形：

```bash
find . -print0 | od -t c 
0000000    .  \0   .   /   R   E   A   D   M   E   .   m   d  \0   .   /
0000020    z   e   r   o   .   b   a   s   h  \0                   
```

od可以把字符串转为8进制、16进制、ASCII等输出，'od -t c'指定输出格式为ASCII。

`find . -print0`用`\0`分割文件名后，可以投递到其他命令中，比如xarg 加`-0`参数，也用`\0`做分隔符：    

```bash
find .  -type f  -print0  | xargs -0 grep "bash"
./README.md:```bash
./README.md:# bash 字符串
./README.md:find .
./zero.bash:#!/usr/bin/env bash
......
```

