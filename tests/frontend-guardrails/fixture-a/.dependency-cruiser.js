/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "ui-no-data-layer",
      comment:
        "组件层不得直接依赖 service 层。请通过 hook 间接访问：先在 src/hooks 暴露查询 hook，" +
        "再由组件调用。理由：保证数据访问路径可替换，组件层不感知 API 形态。",
      severity: "warn",
      from: { path: "^src/components/" },
      to: { path: "^src/services/" },
    },
    {
      name: "no-circular",
      comment: "循环依赖会让模块无法独立测试与替换。请抽出共享部分到 src/lib 或 src/types。",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    // 不设 includeOnly：它会过滤 cruise 范围而不只是报告范围，
    // 导致跨目录违规根本不进入被检查的模块集合、静默漏报。
    // 限定范围用命令行位置参数（depcruise src）。
  },
};
