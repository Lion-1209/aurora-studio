# NOTICE · Aurora Studio

This plugin's default desktop pet, 「大肥鱼」 (DeepSeek whale girl), uses transparent
character artwork from the community project **YunYueSama/codex-deepseek-pet**
(https://github.com/YunYueSama/codex-deepseek-pet), author **YunYueSama**, under the
**大肥鱼项目署名许可 1.0** (see `assets/LICENSE-codex-deepseek-pet.txt`). The asset was
modified: two idle poses were cropped and split into open/closed-eye frames; the author's
compiled web sprite sheet (`codex-deepseek-pet/spritesheet-web.webp`) contributed idle, wave
and jump rows; the walk cycle follows the author's own sampling of the 32-frame motion sheet
(one frame per group of four, i.e. the 8-frame cycle their Codex build ships, which removes the
near-duplicate held poses). All action frames were cropped to a common alpha box, scaled onto
160×160 canvases, joined into horizontal strips and re-encoded as WebP; everything is inlined
into `client.js` as data URLs and drawn by a refresh-locked canvas frame clock.

The character is a community DeepSeek fan creation (鲸鱼娘 / 大肥鱼), **not** an official
DeepSeek asset; the upstream license does not grant rights to underlying third-party
character designs. This project is for personal, non-commercial use and keeps the
attribution above. See `assets/ATTRIBUTION.md` (Chinese) for the full attribution and
rights boundary.

The plugin's own code, icons for other characters, theme/background/pet logic and the
settings UI are original work of this project.
