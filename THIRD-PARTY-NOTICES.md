# Third-party notices · 第三方素材许可与署名

本仓库的**插件代码**使用 [MIT](LICENSE)。但仓库中打包的「大肥鱼 / 鲸鱼娘」角色美术素材**不是** MIT 授权，而是来自以下社区项目，请务必保留署名与许可：

## 1. 大肥鱼 / 鲸鱼娘 character artwork

```text
作者 (Author): YunYueSama
仓库 (Repository): https://github.com/YunYueSama/codex-deepseek-pet
许可 (License): 大肥鱼项目署名许可 1.0 (Dafeiyu Attribution License 1.0)
完整文本: assets/LICENSE-codex-deepseek-pet.txt
项目自带说明: assets/ASSET_LICENSE.md
```

上游许可允许使用、修改、分享及商用，但**必须署名作者与仓库地址，并保留完整许可文本**。本仓库对本素材做了以下修改（必须一并说明）：

- 从 `assets/whale/idle-front.png` 裁切睁眼 / 闭眼两个姿势，对齐、缩放为 520px 高的 WebP（`assets/whale-girl-open.webp` / `assets/whale-girl-closed.webp`）。
- 从作者编译的 `codex-deepseek-pet/spritesheet-web.webp` 抽取 idle / wave / jump 行；按作者自己的取帧方式，从 `assets/whale/motion-walk.png` 的 32 帧中每 4 帧取 1，得到 8 帧走路循环。
- 所有动作帧按共同包围盒裁切、缩放为 160×160 画布、拼成横向帧条并重编码为 WebP（`assets/sprite-*.webp`）。
- 上述图片与 GIF/WebP 帧条以 data URL 形式内联进构建产物 `client.js`，由插件在运行时绘制。

以上修改后的素材仍按**大肥鱼项目署名许可 1.0**分发；再分发时请保留：

1. 本文件与 `assets/ATTRIBUTION.md`；
2. `assets/LICENSE-codex-deepseek-pet.txt` 完整许可文本；
3. 上述「经过修改」的说明。

## 2. 权利边界（重要）

- 上游项目明确说明：其署名许可**不授予底层参考作品、角色设计、标志等第三方内容的额外权利**，也不代表 DeepSeek 官方授权。大肥鱼 / 鲸鱼娘是社区二创形象（原型可追溯到社区设定「溟月」等），**不是 DeepSeek 官方资产**。
- 本仓库仅以个人非商业方式分享插件与二创素材；如将素材用于商业用途，请自行取得底层权利人的授权。
- 若你是相关权利人并希望调整署名或停止使用，请在本仓库提交 issue 联系维护者。

## 3. 其他参考文件

`assets/ref/` 下的上游文档与编译脚本（`2D角色与动作规范.md`、`build-assets.cjs`、`开发指南.md`、`正常速度动画检查.md`、`连续姿势与时间线-preview.3.md`、`局部过渡精修-preview.5.md`、`动画与窗口物理.md`）以及 `motion-walk.png`、`spritesheet-web.webp` 来自同一上游项目（YunYueSama/codex-deepseek-pet），按同一署名许可保留，仅作为素材来源与再生成依据。

## 4. 名称使用

「DeepSeek」仅用于指明该角色与相关服务的来源/兼容性，不表示 DeepSeek 官方认可或关联。
