# Aurora Studio · 极光工作室

一个面向 DeepSeek Harness Web UI 的高自由度定制插件：**主题配色 / 系统深浅色 / 壁纸背景 / Agent 桌宠 / 自定义 CSS**，全部即时生效。

GitHub：<https://github.com/Lion-1209/aurora-studio>

安装后打开 **设置 → 定制工作室**（Settings → Studio）即可调整；所有设置保存在浏览器 `localStorage`（键名 `aurora-studio:settings:v1`），随页面刷新保留。桌宠默认显示 DeepSeek 经典鲸鱼「大肥鱼」。

## 功能

**主题（Theme）**
- 8 套策展配色：极光紫、冰川蓝、樱花粉、苔原绿、落日橙、午夜靛、石墨灰、赛博霓虹。
- 强调色自定义（取色器 / 十六进制输入 / 快捷色板），自动做明暗对比保护；主按钮、焦点环与开关同步取强调色。
- 界面不透明度 0.55–1（默认 0.72）：越低画布越通透、壁纸越明显；卡片、菜单与设置弹窗始终保持接近不透明，保证可读性。
- 面板染色开关：让面板带一点强调色。
- 浅色 / 深色 / 跟随系统：写回 Harness 自带的主题偏好（与「设置 → 通用 → 外观」一致）。

**背景（Background）**
- 7 套渐变壁纸（极光流彩、暮色晚霞、深海雾、樱吹雪、苔原森林、石墨暗纹、星野），随深浅色切换两套配色。
- 自定义图片：本地上传（自动压缩到 ≤1920px 的 JPEG，降低存储占用）或填写 http(s) 图片地址；上传优先。
- 显示调整：图片不透明度、遮罩深度（提升前景可读性）、模糊、动态渐变开关。
- 实现方式：壁纸绘制在 `html::before` 背景层，界面表面通过主题 token 的 alpha 透出壁纸；不透明度拉满即恢复纯色界面。

**桌宠（Pet）**
- **大肥鱼（DeepSeek 「鲸鱼娘」社区拟人形象，默认）**：使用社区授权透明立绘与动作序列，具备**待机眨眼、走路、挥手、跳跃**四组动画；自由运动时播放走路（**8 帧精选步态循环**，源图 32 帧里每 4 帧取 1、去掉作者标注的四帧一组近似保持，Canvas 绘制 + 刷新次数锁定节拍，约 0.93s/循环），点击挥手，双击跳跃，停下待机。
- 另外 5 个手绘 SVG 角色：墨墨、喵呜、幽幽、小机、星星，随强调色染色。
- 可拖拽移动（位置会记住），点击说话，双击撒欢，眼睛会跟随鼠标（手绘角色）。
- **大小自由缩放 40 – 360 像素**（设置里滑杆，或把鼠标放在桌宠上滚动滚轮即可快速缩放）。
- **运动模式**：静止 / 自由运动（自己在屏幕上漫步）/ 跟随鼠标（轻轻跟在光标旁）；运动速度 20–180 px/s 可调；拖动、悬停或点击时会自动暂停，松手后继续。
- **余额与用量（气泡）**：桌宠下方有一个小钱包按钮，点击后在桌宠上方弹出气泡卡片：
  - **余额**：DeepSeek 账户各币种余额 / 赠金
  - **本会话 tokens**：输入、输出、缓存与合计 tokens，以及上下文占用（来自 token-meter 的 `tokenUsage` / `contextPressure` 会话投影，随对话实时更新）
  - **查看用量** / **充值**：跳转官方 Platform 页面；刷新按钮与更新时间
  - 需要先在「设置 → 账户」登录 DeepSeek 账号；插件只通过官方 Remote 读取钱包金额与公开链接，不接触、不保存任何凭据
- 空闲随机气泡：可调间隔，支持自定义台词（每行一句，最多 40 句）。
- 不透明度、名字可调；`Ctrl + Shift + A` 快速显示 / 隐藏。
- 渲染在 Harness 的 `shell.overlay` 浮层中，初始化时鼠标穿透，只有桌宠本身可点击，不会挡住界面操作。
- 大肥鱼专属台词：「我是吃白饭的大肥鱼！」「才、才不是胖，是浮力大！」「鱼片，今天也要一起加油哦」等。

> **形象来源与许可（重要）**：大肥鱼的透明角色立绘与动作序列来自社区桌宠项目 **YunYueSama/codex-deepseek-pet**（作者 YunYueSama，[仓库地址](https://github.com/YunYueSama/codex-deepseek-pet)），依「**大肥鱼项目署名许可 1.0**」使用：须署名作者与仓库、保留完整许可；本插件对素材做了修改（裁切睁眼/闭眼两帧；从作者编译的网页动作图集抽取 idle/wave/jump 行；走路沿用作者对 32 帧 motion 图集的取帧方式——每 4 帧取 1 得到 8 帧精选循环，去掉四帧一组的近似保持；统一裁切、缩放到 160×160 帧、重新编码为 WebP）。完整署名与权利边界见 [`assets/ATTRIBUTION.md`](aurora-studio/assets/ATTRIBUTION.md) 与 [`assets/LICENSE-codex-deepseek-pet.txt`](aurora-studio/assets/LICENSE-codex-deepseek-pet.txt)，包根目录另有 [`NOTICE.md`](aurora-studio/NOTICE.md)。「大肥鱼 / 鲸鱼娘」是社区二创形象（原型可追溯到社区设定「溟月」等），**非 DeepSeek 官方资产**；上游许可不授予底层第三方角色设计的额外权利，本插件仅作个人非商业使用。

**高级（Advanced）**
- 全局自定义 CSS：即时注入，完全自由的样式微调（写错可能影响界面，请谨慎）。
- 动画总开关：一键停止主题、壁纸与桌宠动效；同时遵守系统「减少动态效果」。
- 导入 / 导出设置 JSON（复制、下载、校验后导入；导出的 JSON 不含上传图片的二进制数据，只记录其大小），一键重置全部设置。

## 安装 / 卸载

本插件是一个本地 bundle 包：

```json
{ "dsh": { "bundle": { "patch": "./cordis.patch.yml" },
           "client": { "platform": "web", "immediately": true } } }
```

- **安装**：由 Harness 的插件管理能力安装本目录（`@local/aurora-studio`），无需单独构建依赖；`client.js` 已随包提供。
- **卸载**：在插件管理中移除该 bundle 即可；已写入 `localStorage` 的个性化设置不会被自动清除（需要时在浏览器中删除 `aurora-studio:settings:v1`）。

## 开发

源码是单一客户端模块的若干片段，`build.mjs` 按顺序拼接到 `window.__ModuleLoader__.load({ id: '@local/aurora-studio', factory(require) {...} })` 的工厂作用域中：

| 片段 | 内容 |
|---|---|
| `src/00-core.js` | 常量、颜色运算、主题/壁纸预设、i18n 辅助 |
| `src/05-pet-image.js` | **生成文件**：大肥鱼睁眼/闭眼立绘的内联 data URL（`tools/build-pet-images.mjs`） |
| `src/07-pet-sprites.js` | **生成文件**：待机/走路/挥手/跳跃帧条的内联 data URL |
| `src/10-store.js` | 设置默认值、清洗、localStorage store、React hooks、运行时门面 |
| `src/12-account.js` | 账户余额摘要、token 用量投影观察器与用量 store |
| `src/20-theme.js` | 把设置转换为 `theme.overrideTokens` 的 `{light,dark}` token 层 |
| `src/25-background.js` | 壁纸 CSS（`html::before` 背景层 + 遮罩） |
| `src/40-pet-art.js` | 5 个 SVG 角色、`PetArt` 组件、桌宠与漫画气泡样式 |
| `src/42-pet-sprite.js` | 大肥鱼 Canvas 帧动画（走路/挥手/跳跃/待机） |
| `src/44-pet-account.js` | 「余额」按钮、漫画气泡、余额与 tokens 展示 |
| `src/45-pet.js` | `shell.overlay` 中的桌宠行为（拖拽/漫游/气泡/热键） |
| `src/50-settings-view.js` | 设置页四分区 UI |
| `src/55-settings-css.js` | 设置页样式（只用 `--dsw-alias-*` token） |
| `src/90-apply.js` | 插件装配：样式标签、token 层、槽位注册、错误边界 |

生成素材用的开发脚本：

- `tools/build-pet-images.mjs`：把 `assets/` 里的 WebP 帧条内联为 `src/05-pet-image.js` / `src/07-pet-sprites.js`
- `tools/extract-sprites.py`：从上游动作图集裁切并生成 160×160 帧条（需要 Pillow）

```powershell
node build.mjs     # 生成 client.js
node --check client.js
node verify.mjs    # 静态验收：清单、元数据、单作用域声明、禁用模式、CSS 命名空间
```

技术要点（调研结论，见 `research/api-notes.md`）：

- 客户端模块契约：`window.__ModuleLoader__.load({ id, factory(require) })`，工厂返回 `{ inject, apply(ctx) }`；bundle 插件没有 `ctx.styles`/`styles.insert`，因此样式以 `<style data-plugin="...">` 标签在 `ctx.effect` 中注入并随插件卸载移除。
- 主题通过 `ctx.theme.overrideTokens(source, { token: { light, dark } })` 实现；Host 的 `ThemePresenter` 把 token 写成 `document.body` 的内联 CSS 变量。
- 设置页注册到 `settings.section` 槽位（id `aurora-studio`，order 25），桌宠注册到 `shell.overlay`（id `aurora-pet`，order 90）；两处都包了 React 错误边界，单个组件异常不会拖垮整个界面。

## 验证说明（重要）

- 已通过：`node build.mjs`、`node --check client.js`、`node verify.mjs` 静态验收，以及 61 项离线行为检查（`research/_review-harness.mjs`：apply/销毁生命周期、slot 注册、主题 token 成对、壁纸开关、自定义 CSS、导入校验、配额失败不抛出等）。
- 已通过安装后动态检查（客户端槽位实时查询）：`settings.section` 中出现 `aurora-studio`（order 25，active），`shell.overlay` 中出现 `aurora-pet`（order 90，active），说明客户端模块已加载并完成两处注册。
- **尚未做像素级视觉验证**：当前环境没有浏览器控制/截图能力，无法确认具体配色、壁纸透明度和桌宠动画的实际观感；插件管理器中的图标/标题渲染也未逐像素确认。若观感需要微调，可在设置页即时修改或一键重置。

## 许可 / License

- **插件代码**：[MIT](LICENSE) © 2026 Lion (GitHub: Lion-1209)。
- **大肥鱼 / 鲸鱼娘角色素材**：来自社区项目 **YunYueSama/codex-deepseek-pet**（作者 YunYueSama），依 [**大肥鱼项目署名许可 1.0**](assets/LICENSE-codex-deepseek-pet.txt) 使用。该许可允许使用、修改、分享及商用，但**必须署名作者与仓库并保留完整许可文本**；本仓库对素材做了裁切、取帧、缩放与 WebP 重编码（详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)、[NOTICE.md](NOTICE.md)、[assets/ATTRIBUTION.md](assets/ATTRIBUTION.md)）。
- **权利边界**：大肥鱼 / 鲸鱼娘是社区二创形象（原型可追溯到社区设定「溟月」等），**不是 DeepSeek 官方资产**；上游许可不授予底层第三方角色设计、标志等权利。本项目仅作个人非商业分享；再分发请保留署名与许可。若相关权利人希望调整署名或停止使用，请提交 issue 联系维护者。

## 目录

```
aurora-studio/
├─ package.json          # bundle 清单 + dsh.client
├─ cordis.patch.yml      # 插入 aurora-studio 行
├─ index.js              # Host 半边（无服务，仅占位）
├─ client.js             # 构建产物（浏览器模块）
├─ icon.svg              # 插件图标
├─ locale/{en,zh}.json   # 插件管理器显示的标题/描述
├─ build.mjs / verify.mjs
├─ INTERFACES.md         # 多作者片段的接口契约
├─ research/             # API 调研与集成审查（开发资料，不参与运行）
└─ src/                  # 片段源码
```
