import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format-price";

// 违规样例：.only 未删除
// 期望 @vitest/eslint-plugin 的 no-focused-tests 报错
describe.only("formatPrice", () => {
  // 违规样例：测试没有断言
  // 期望 @vitest/eslint-plugin 的 expect-expect 报错
  it("formats whole units", () => {
    formatPrice(1999);
  });

  it("formats with symbol", () => {
    expect(formatPrice(1999)).toBe("$19.99");
  });
});
