// 由 frontend-guardrails skill 生成：项目已有 ESLint 10（flat config），按项目版本适配，不升降版本。
// 非 React、无测试框架、无 E2E，因此不装 jsx-a11y / react 插件 / vitest 插件 / playwright 插件。
// 新启用的规则一律 warn（基线策略）。
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import boundaries from "eslint-plugin-boundaries";

const asWarn = (config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([rule, value]) => [
      rule,
      Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn",
    ])
  ),
});

export default [
  { ignores: ["dist/**", "coverage/**", "reports/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    },
  },

  {
    ...asWarn(sonarjs.configs.recommended),
    rules: {
      ...asWarn(sonarjs.configs.recommended).rules,
      // 纯噪声：要求每个文件带版权头
      "sonarjs/file-header": "off",
      // 误报：认不出 tsconfig paths 别名
      "sonarjs/no-implicit-dependencies": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      // TS 无扩展名 / 别名导入必须配 resolver，否则 boundaries 静默失效
      "import/resolver": { typescript: true },
      "boundaries/elements": [
        { type: "service", pattern: "src/services" },
        { type: "lib", pattern: "src/lib" },
        { type: "util", pattern: "src/utils" },
        { type: "cli", pattern: "src/cli" },
      ],
    },
    rules: {
      // 哨兵：resolver 失效时立刻报错，而不是静默全绿
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/dependencies": [
        "warn",
        {
          default: "allow",
          policies: [
            {
              from: { element: { type: ["service", "lib", "util"] } },
              disallow: { to: { element: { type: "cli" } } },
            },
          ],
        },
      ],
    },
  },
];
