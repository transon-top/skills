// 死代码样例：没有任何模块 import
// 期望 knip 报 unused file

export function neverImported(seed: number): number {
  return seed * 2 + 1;
}
