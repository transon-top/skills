// 由 frontend-guardrails skill 生成：ESLint 已存在（9.x，flat config），在其上追加插件，不重写。
// 新启用的规则一律 warn（基线策略）。
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import vitest from "@vitest/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import boundaries from "eslint-plugin-boundaries";

// 把 preset 的全部规则降为 warn，保留原有选项
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
  {
    // 生成物不进 lint。
    // .stryker-tmp 必须排除：stryker 会把整个项目复制进 sandbox 并给每个文件
    // 加 @ts-nocheck，不排除的话下一次 lint 会炸出成百上千条 ban-ts-comment 报错。
    ignores: [
      "dist/**",
      "src/client/**",
      "coverage/**",
      "reports/**",
      ".stryker-tmp/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    ...asWarn(jsxA11y.flatConfigs.recommended),
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: { ...globals.browser },
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      "@typescript-eslint/no-restricted-imports": [
        "warn",
        {
          patterns: [
            { group: ["../*", ".."], message: "请使用 @/ 别名导入，不要用相对父级路径" },
          ],
        },
      ],
    },
  },

  {
    ...asWarn(sonarjs.configs.recommended),
    rules: {
      ...asWarn(sonarjs.configs.recommended).rules,
      // 纯噪声：要求每个文件带版权头
      "sonarjs/file-header": "off",
      // 误报：认不出 Vite 的 peer 依赖与 @/ 路径别名
      "sonarjs/no-implicit-dependencies": "off",
    },
  },
  asWarn(reactYouMightNotNeedAnEffect.configs.recommended),

  {
    files: ["**/*.test.{ts,tsx}"],
    ...vitest.configs.recommended,
    languageOptions: {
      globals: { ...vitest.environments.env.globals },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "warn",
      "vitest/no-focused-tests": "warn",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      // TS 无扩展名 / 别名导入必须配 resolver，否则 boundaries 静默失效
      "import/resolver": { typescript: true },
      "boundaries/elements": [
        // 生成目录也算元素，否则哨兵规则会对它报 unknown
        { type: "client", pattern: "src/client" },
        { type: "component", pattern: "src/components" },
        { type: "hook", pattern: "src/hooks" },
        { type: "service", pattern: "src/services" },
        { type: "lib", pattern: "src/lib" },
        { type: "util", pattern: "src/utils" },
        { type: "type", pattern: "src/types" },
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
              from: { element: { type: ["service", "lib", "util", "type"] } },
              disallow: { to: { element: { type: ["component", "hook"] } } },
            },
          ],
        },
      ],
    },
  },
];
