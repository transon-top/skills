#!/usr/bin/env bash
#
# frontend-guardrails 夹具断言。
#
# 夹具是 skill 在一个真实项目上跑完后的「golden 产物」。本脚本不重新执行 skill，
# 而是断言那份产物仍然成立：配置能被解析、埋的违规仍被抓到、
# 以及最关键的——那些「静默失效」的检查没有变成永远全绿。
#
# 用法：bash tests/frontend-guardrails/run.sh
# 前置：两个夹具都已 pnpm install。

set -uo pipefail
cd "$(dirname "$0")" || exit 1

PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# 文件存在 / 不存在
has_file() { [ -f "$1" ] && ok "存在 $1" || bad "缺失 $1"; }
has_dir()  { [ -d "$1" ] && ok "存在 $1/" || bad "缺失 $1/" ; }
no_file()  { [ -f "$1" ] && bad "不应存在 $1" || ok "正确地不存在 $1"; }

# 跑命令，捕获输出到 $TMP/out（已剥离 ANSI 颜色码，否则表格类输出无法用正则匹配）；返回退出码
run() {
  local dir="$1"; shift
  ( cd "$dir" && "$@" ) 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' >"$TMP/out"
  return "${PIPESTATUS[0]}"
}

# 期望退出码为 0
expect_ok() {
  local desc="$1" dir="$2"; shift 2
  if run "$dir" "$@"; then
    ok "${desc}"
  else
    bad "${desc}（退出码非 0）"
    sed 's/^/      /' "$TMP/out" | tail -8
  fi
}

# 期望退出码非 0
expect_fail() {
  local desc="$1" dir="$2"; shift 2
  if run "$dir" "$@"; then bad "${desc}（本应失败却通过了）"; else ok "${desc}"; fi
}

# 期望 $TMP/out 含某个模式（在 expect_* 之后调用，复用最近一次输出）
out_has() {
  local desc="$1" pattern="$2"
  if grep -qE -- "$pattern" "$TMP/out"; then ok "$desc"; else bad "$desc"; fi
}

out_lacks() {
  local desc="$1" pattern="$2"
  if grep -qE -- "$pattern" "$TMP/out"; then bad "$desc"; else ok "$desc"; fi
}

# 抽取 knip 风格输出里以 $1 开头的段落（到下一个大写开头的行或空行为止）
block() {
  awk -v sec="$1" '$0 ~ "^"sec {f=1;next} /^[A-Z]/ {f=0} f' "$TMP/out"
}

block_has() {
  local desc="$1" sec="$2" pattern="$3"
  if block "$sec" | grep -qE -- "$pattern"; then ok "$desc"; else bad "$desc"; fi
}

block_lacks() {
  local desc="$1" sec="$2" pattern="$3"
  if block "$sec" | grep -qE -- "$pattern"; then bad "$desc"; else ok "$desc"; fi
}

# 读 package.json 字段：pkg_field <dir> <js 表达式，p 为 package.json>
pkg_field() {
  node -e "const p=require('./$1/package.json');console.log(String($2))" 2>/dev/null
}

# ─────────────────────────────────────────────────────────────
head_ "fixture-a · React + TS + Vitest + OpenAPI spec"

A=fixture-a

if [ ! -d "$A/node_modules" ]; then
  bad "$A 未安装依赖，先跑：cd $A && pnpm install"
else
  head_ "  配置产物"
  for f in eslint.config.js openapi-ts.config.ts knip.json .jscpd.json \
           stryker.config.mjs .dependency-cruiser.js tsconfig.probes.json \
           CLAUDE.md; do
    has_file "$A/$f"
  done
  has_dir "$A/src/client"

  head_ "  tsconfig 严格选项真的生效"
  # 生效配置（不是文件里写了什么）
  run "$A" pnpm exec tsc --noEmit --showConfig
  out_has "生效配置含 noUncheckedIndexedAccess" '"noUncheckedIndexedAccess": true'
  # 探针必须报错——只确认「没报错」什么都证明不了
  expect_fail "typecheck:probe 按设计失败（证明 flag 生效）" "$A" pnpm run typecheck:probe
  out_has "  报出 TS2322（noUncheckedIndexedAccess）" 'error TS2322'
  out_has "  报出 TS2375（exactOptionalPropertyTypes）" 'error TS2375'

  head_ "  主体检查通过"
  expect_ok "typecheck 通过" "$A" pnpm run typecheck
  expect_ok "check 聚合通过（lint + typecheck + deps）" "$A" pnpm run check

  head_ "  ESLint 抓到埋的违规"
  run "$A" pnpm run lint
  out_has "boundaries 抓到 service → component" 'Dependencies to elements of type "component" are not allowed'
  out_has "抓到多余 useEffect 派生状态" 'react-you-might-not-need-an-effect/no-derived-state'
  out_has "抓到 .only" 'vitest/no-focused-tests'
  out_has "抓到无断言测试" 'vitest/expect-expect'
  out_has "抓到 img 缺 alt" 'jsx-a11y/alt-text'
  # 哨兵没有误报 = resolver 与 elements 都配对了
  out_lacks "哨兵无误报（resolver + elements 配对正确）" 'boundaries/no-unknown-dependencies'
  # 基线策略：新规则一律 warn，不阻塞
  out_lacks "无 error 级输出（新规则全部 warn）" '[0-9]+:[0-9]+\s+error\s'
  # stryker 的 .stryker-tmp/sandbox 副本带 @ts-nocheck，必须被 ignores 排除
  out_lacks "未 lint 到 stryker 沙箱副本" 'ban-ts-comment'

  head_ "  检出类工具抓到埋的样例"
  run "$A" pnpm exec knip --no-exit-code
  block_has "knip 抓到死代码" "Unused files" '^src/dead-module\.ts'
  # 生成目录被 knip 忽略：不应出现在 Unused files 段落里
  block_lacks "knip 未把生成目录列为未使用文件" "Unused files" '^src/client/'
  run "$A" pnpm run dup
  out_has "jscpd 抓到重复实现" 'Clone found'
  # 表格里 Format 列后跟的是分析文件数，非 0 才说明真的扫到了文件（区别于静默空扫描）
  out_has "jscpd 真的分析了文件（非空扫描）" 'typescript\s*│\s*[1-9][0-9]*\s*│'
  run "$A" pnpm run deps
  out_has "depcruise 抓到 component → service" 'ui-no-data-layer'
  out_has "depcruise 显示了 comment（err-long）" '组件层不得直接依赖 service 层'

  head_ "  变异测试"
  expect_ok "stryker dry-run 成功" "$A" pnpm exec stryker run --dryRunOnly

  head_ "  规范注入"
  if [ "$(grep -c 'FRONTEND_GUARDRAILS_START' "$A/CLAUDE.md")" = "1" ]; then
    ok "marker 只出现一次"
  else
    bad "marker 出现次数不为 1"
  fi
fi

# ─────────────────────────────────────────────────────────────
head_ "fixture-b · 非 React / 无 spec / 无测试框架（降级路径）"

B=fixture-b

if [ ! -d "$B/node_modules" ]; then
  bad "$B 未安装依赖，先跑：cd $B && pnpm install"
else
  head_ "  前置条件缺失时不生成对应配置"
  no_file "$B/openapi-ts.config.ts"
  no_file "$B/stryker.config.mjs"
  [ -d "$B/src/client" ] && bad "不应存在 $B/src/client" || ok "正确地不存在 $B/src/client（无 spec）"
  has_file "$B/eslint.config.js"
  has_file "$B/knip.json"
  has_file "$B/.jscpd.json"
  has_file "$B/.dependency-cruiser.js"
  has_file "$B/CLAUDE.md"

  head_ "  按项目版本适配，不升降版本"
  if [ "$(pkg_field "$B" "p.devDependencies.eslint.match(/\d+/)[0]")" = "10" ]; then
    ok "ESLint 主版本保持 10"
  else
    bad "ESLint 主版本被改动"
  fi
  if [ "$(pkg_field "$B" "p.devDependencies['@eslint/js'].match(/\d+/)[0]")" = "10" ]; then
    ok "@eslint/js 与 ESLint 主版本一致（10）"
  else
    bad "@eslint/js 主版本与 ESLint 不一致"
  fi

  head_ "  非 React 项目不该出现 React 相关依赖"
  for dep in react-doctor eslint-plugin-jsx-a11y eslint-plugin-react-you-might-not-need-an-effect @vitest/eslint-plugin eslint-plugin-playwright @stryker-mutator/core; do
    if node -e "const p=require('$B/package.json');process.exit(p.devDependencies[process.argv[1]]||p.dependencies?.[process.argv[1]]?1:0)" "$dep" 2>/dev/null; then
      bad "不该装 $dep"
    else
      ok "正确地未装 $dep"
    fi
  done

  head_ "  检查仍然生效"
  run "$B" pnpm run lint
  out_has "boundaries 抓到 service → cli" 'Dependencies to elements of type "cli" are not allowed'
  out_lacks "哨兵无误报" 'boundaries/no-unknown-dependencies'
  run "$B" pnpm exec knip --no-exit-code
  out_has "knip 抓到死代码" 'src/orphan\.ts'
  run "$B" pnpm exec jscpd . --reporters console,silent
  out_has "jscpd 抓到重复实现" 'Clone found'
  run "$B" pnpm exec depcruise --output-type err-long src
  out_has "depcruise 抓到 service → cli" 'service-no-cli'
fi

# ─────────────────────────────────────────────────────────────
printf '\n\033[1m结果：%d 通过，%d 失败\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
