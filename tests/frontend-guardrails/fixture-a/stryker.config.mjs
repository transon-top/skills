/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  // 必须显式声明：自动加载 @stryker-mutator/* 在这个 pnpm 布局下没生效
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/client/**"],
  reporters: ["clear-text", "progress"],
  coverageAnalysis: "perTest",
  // 不设失败阈值：equivalent mutants 永远存在，分数一旦成为目标，
  // agent 会为数字优化而不是为代码质量优化
  thresholds: { high: 80, low: 60, break: null },
  ignoreStatic: true,
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
};
