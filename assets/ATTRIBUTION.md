# 大肥鱼角色素材署名 / Artwork attribution

本插件使用的大肥鱼（DeepSeek 鲸鱼娘）透明角色立绘来自以下社区项目（**非 DeepSeek 官方资产**）：

```text
作者：YunYueSama
仓库：https://github.com/YunYueSama/codex-deepseek-pet
许可：大肥鱼项目署名许可 1.0（完整文本见 LICENSE-codex-deepseek-pet.txt）
```

- **原始文件**：
  - `assets/whale/idle-front.png`（同一画布上的睁眼 / 闭眼两个待机姿势）；
  - `codex-deepseek-pet/spritesheet-web.webp`（作者用 `scripts/build-assets.cjs` 编译的网页动作图集，8 列 × 9 行 × 192px，行序为 idle / walk-right / walk-left / wave / jump / …）；
  - `assets/whale/motion-walk.png`（作者 32 帧完整步态循环图集，4 列 × 8 行 × 512px）。
- **本插件中的修改**：
  - 从 `idle-front.png` 按 alpha 空白列把两个姿势分别裁切、统一画布对齐、等比缩放到 520px 高、重新编码为 WebP（`whale-girl-open.webp` / `whale-girl-closed.webp`），内联进 `client.js`；闭眼帧用于设置页预览与眨眼备用。
  - 从 `spritesheet-web.webp` 抽取第 0 行（idle，6 帧）、第 3 行（wave，4 帧）、第 4 行（jump，5 帧）。
  - 从 `motion-walk.png` 沿用作者自己的取帧方式：32 帧里**每 4 帧取 1**（第 0 列 8 行），得到其 Codex 版本实际使用的 8 帧精选步态循环；作者 QA 文档指出原图集「四帧一组近似保持」会让一个姿势停留、下一个姿势突变，取 1 帧/组正好去掉这些近似保持帧。播放端再用 Canvas + 刷新次数锁定节拍，避免长短帧。
  - 以上动作帧按动作共同的 alpha 包围盒裁切、缩放到 160×160 画布（保持比例、底部对齐）、拼成横向帧条（`assets/sprite-*.webp`），再内联进 `client.js` 作为逐帧动画。
- **用途**：个人、非商业的桌宠插件；未对角色形象本身作二次设定修改。

## 权利边界

据来源项目 `ASSET_LICENSE.md`：项目作者有权授权其新增贡献（允许使用、修改、分享及商用，须署名 YunYueSama 与仓库地址、保留完整许可）；但该许可**不授予底层参考作品、角色设计、标志等第三方内容的额外权利**，也不代表 DeepSeek 官方授权。大肥鱼 / 鲸鱼娘是社区二创形象（原型可追溯到「上善无形」创作的「溟月」等社区设定）。

如你是相关权利人并希望调整署名或停止使用，请通过插件仓库/安装目录联系维护者。

## 必须保留

再分发本插件或其素材时，请保留：

1. 上方署名（作者 + 仓库 + 许可）；
2. `LICENSE-codex-deepseek-pet.txt` 完整许可文本；
3. 「经过修改」的说明。
