// 严格选项探针：这两处在 tsconfig 开启对应选项后必须报错。
// 用来证明 flag 真的生效——只确认"没报错"什么都证明不了。

export type ProbeOptions = {
  label?: string;
};

// noUncheckedIndexedAccess：values[0] 的类型应是 string | undefined
export function firstOf(values: string[]): string {
  return values[0];
}

// exactOptionalPropertyTypes：显式 undefined 不合法
export function makeOptions(): ProbeOptions {
  return { label: undefined };
}
