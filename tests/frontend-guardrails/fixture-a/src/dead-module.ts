// 死代码样例：没有任何模块 import 这个文件
// 期望 knip 报 unused file

export function neverCalled(input: string): string {
  return input.split("").reverse().join("");
}

export const NEVER_USED_CONSTANT = 42;
