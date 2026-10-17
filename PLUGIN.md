# 插件接入约定（宿主：anka 核心服务）

本仓库是**独立 git 仓库**，由宿主以目录形式放到 `plugins/anka-quickdraw/` 加载；
核心仓库的 `.gitignore` 忽略 `plugins/*`（仅例外保留 `plugins/README.md`），
既不跟踪插件代码，也不代为提交。

## 1. 不提交 `dist/`

`dist/` 是构建产物，已在 `.gitignore` 中忽略。仓库只保留源码，宿主在
安装 / 更新时按 `plugin.json` 的 `build.steps` **现场构建**。

## 2. 构建配方（`plugin.json`）

```json
"build": {
  "cwd": ".",
  "requires": ["node>=18"],
  "steps": [
    { "run": "npm ci --ignore-scripts" },
    { "run": "npm run build --workspace=quickdraw-app" }
  ],
  "output": { "entry": "dist/index.html" },
  "timeout": 600
}
```

- `steps` 不使用 shell，逐条 `exec`，每步独立超时（`timeout` 秒）；
- 首 token 只允许 `npm` / `node` / `npx` / `pnpm` / `yarn` / `bun` / `python` /
  `python3` / `pip`，禁止 `; & | $ > < ( ) { } * ? ~`；
- `apps/app/vite.config.js` 的 `outDir` 指向仓库根 `dist/`，`base: './'`，
  因此 `build.output.entry = dist/index.html` 与宿主 iframe（`/plugins/anka-quickdraw/dist/index.html`）一致；
- `requires` 不满足（如 Node < 18）时直接失败，不执行任何步骤。

## 3. 更新流程：拉源码 → 前端点「加载更新」

1. 在本仓库 `git pull`（或切到目标分支）；
2. 确认 Node 版本满足 `requires`；
3. 宿主「控制台 → 插件管理 → QuickDraw」点 **加载更新**
   （`POST /api/plugins/anka-quickdraw/build`）；
4. 宿主重跑 `build.steps`，成功后 page 入口 URL 会带上产物 mtime，
   前端自动重挂 iframe，加载新构建；
5. 首次安装：可安装区点 **构建并安装**（安装时先构建，失败则不发 installed 事件）。

失败时按钮会提示出错步骤与日志尾；完整日志在宿主后端日志（`plugins.build_recipe`）。

## 4. 版本号：提交后必须写

`plugin.json` 的 `version` 是宿主识别插件身份与新旧版本的**唯一**依据。

1. **提交源码后必须 bump `version`**：与代码同一提交，或紧随其后的提交；
2. 语义化：修复 `patch`（0.3.0 → 0.3.1）、向后兼容新能力 `minor`（0.3.1 → 0.4.0）、
   破坏性变更 `major`（→ 1.0.0）；
3. 不 bump → 宿主、插件管理页与 ledger 都视为同一版本，用户点「加载更新」也
   无法判断新旧；
4. ledger 记录的是安装时的 `version`，重新安装或构建后写入新值。

### 4.1 提交前自动检查（git hook）

仓库自带 `.githooks/pre-commit`，启用一次（只影响本仓库）：

```sh
git config core.hooksPath .githooks
```

行为：

| 场景 | 结果 |
|---|---|
| 暂存区有源码改动，`version` 与 HEAD 相同 | 打印提醒（默认不阻断） |
| 只改 `plugin.json` 但版本没变 | 同样提醒 |
| 首次提交（HEAD 里还没有 `plugin.json`） | 不提示 |
| `VERSION_CHECK=strict git commit …` | 提醒升级为阻断（`exit 1`） |
| `VERSION_CHECK=off` 或 `git commit --no-verify` | 跳过检查 |

默认只提醒、不硬拦的原因：约定是「先提交源码，紧随其后一个提交 bump version」，
硬性门禁会让第一批代码提交无法进行。要改成强制门禁，用 `VERSION_CHECK=strict`
或把钩子里的 `exit 0` 改成 `exit 1`。

其他可选做法（按需选一个即可，不必都上）：

- 用 `pre-push` 而不是 `pre-commit` 做硬门禁：推送前比较 `HEAD` 与远端分支的
  `plugin.json` 版本，版本没变就拒绝推送；
- CI（GitHub Actions）里比较 `HEAD` 与上一个 tag 的 `version`，未变则 job 失败；
- 发布时打 tag（`v0.3.1`），tag 与 `version` 必须一致，用脚本互检。

## 5. 自检

```bash
cd server
python -m app.cli verify anka-quickdraw   # manifest / build 白名单 / 产物声明
python -m app.cli doctor                  # build_pending 属正常（未构建），不算问题
```

## 6. 权限声明

`permissions` 目前只做展示，不参与鉴权：`net`（构建期联网装依赖）、
`write:dist`（写构建产物）。
