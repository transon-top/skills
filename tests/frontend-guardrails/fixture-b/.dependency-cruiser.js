/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "service-no-cli",
      comment:
        "service 层不得依赖 cli 层。输出格式属于 cli 层的关注点，" +
        "service 应返回结构化数据，由 cli 负责渲染。" +
        "理由：保证同一份 service 能被非命令行入口复用。",
      severity: "warn",
      from: { path: "^src/(services|lib|utils)/" },
      to: { path: "^src/cli/" },
    },
    {
      name: "no-circular",
      comment: "循环依赖会让模块无法独立测试与替换。请抽出共享部分到 src/lib。",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
