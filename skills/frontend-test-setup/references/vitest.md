# Vitest 配置规范

## 配置原则

- 优先复用项目现有的 Vite / TypeScript 配置。
- 项目没有 Vitest 配置时，再创建 `vitest.config.ts`。
- 修改已有配置前必须先读取。
- 明确指定测试 environment。
- 只有在需要 DOM API 时才使用 `jsdom`。
- 纯逻辑测试尽量不要依赖 browser-like environment。

## 文件命名

默认：

```text
*.test.ts
*.test.tsx
```

如果项目已有其他明确规范，应遵循项目规范。

## 文件位置

Vitest 测试优先与源码 colocate：

```text
src/
├── utils/
│   ├── formatPrice.ts
│   └── formatPrice.test.ts
```

这样源码重构或删除时，相关测试更容易一起维护。

## Component 测试

Component 测试应该关注 observable behavior，而不是 implementation details。

推荐：

```text
render
  ↓
user interaction
  ↓
observable result
```

不应该过度测试：

- private function
- internal state implementation
- DOM 内部结构
- 不影响用户行为的实现细节

## Mocking

在以下情况下可以 mock external boundary：

- 保持测试 deterministic
- 隔离 network
- 避免昂贵依赖
- 提高执行速度

不要为了让 assertion 更容易而 mock 被测试的核心逻辑。

Mock 应尽量局部化，避免产生全局状态污染。

## 测试目标

优先编写快速、确定性、大量 case、易定位失败原因的测试。
