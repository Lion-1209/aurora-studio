/**
 * 55-settings-css.js — Aurora Studio settings page styles (studio-ui).
 *
 * Fragment of the single client module scope: declares only `STUDIO_CSS`.
 * Chrome colors come exclusively from host `--dsw-alias-*` / `--dsw-radius-*`
 * tokens so light, dark and host theme overrides keep working; there are no
 * literal chrome colors in this sheet. Literal colors only appear inline in
 * user previews (accent swatches, wallpaper thumbnails) built by the view.
 *
 * Every selector is scoped under `.aurora-studio-` so nothing leaks into the
 * host settings shell.
 */

const STUDIO_CSS = `
.aurora-studio-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 8px;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
}

.aurora-studio-root,
.aurora-studio-root * {
  box-sizing: border-box;
}

/* ---------------- page header ---------------- */

.aurora-studio-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 0 4px;
}

.aurora-studio-head-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.aurora-studio-title {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.aurora-studio-subtitle {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.aurora-studio-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  margin-top: 2px;
  padding: 2px 9px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
}

.aurora-studio-live-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
  animation: aurora-studio-pulse 2.4s ease-in-out infinite;
}

/* ---------------- tabs ---------------- */

.aurora-studio-tabbar-wrap {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 6px 0 10px;
  background: var(--dsw-alias-bg-layer-2);
}

.aurora-studio-tabbar {
  display: flex;
  gap: 2px;
  width: 100%;
  padding: 3px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-3);
}

.aurora-studio-tab {
  flex: 1 1 0;
  min-width: 0;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}

.aurora-studio-tab:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.aurora-studio-tab[aria-selected="true"] {
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.aurora-studio-tab:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}

.aurora-studio-tab-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ---------------- tab panel ---------------- */

.aurora-studio-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 0 4px;
  animation: aurora-studio-enter .18s ease-out both;
}

.aurora-studio-panel:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
  border-radius: var(--dsw-radius-lg);
}

/* ---------------- cards / sections ---------------- */

.aurora-studio-section {
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-bg-layer-1);
  padding: 14px 16px 8px;
}

.aurora-studio-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
}

.aurora-studio-section-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.aurora-studio-section-title {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.aurora-studio-section-desc {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.aurora-studio-badge {
  flex: none;
  margin-top: 1px;
  padding: 1px 8px;
  border: .5px solid var(--dsw-alias-brand-primary);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.aurora-studio-section-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ---------------- rows ---------------- */

.aurora-studio-row,
.aurora-studio-slider,
.aurora-studio-field {
  border-top: .5px solid var(--dsw-alias-border-l2);
  padding: 11px 0;
}

.aurora-studio-section-body > :first-child {
  border-top: none;
}

.aurora-studio-section-body > .aurora-studio-row:first-child,
.aurora-studio-section-body > .aurora-studio-slider:first-child,
.aurora-studio-section-body > .aurora-studio-field:first-child {
  padding-top: 10px;
}

.aurora-studio-section-body > .aurora-studio-segmented {
  margin: 10px 0 12px;
}

.aurora-studio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.aurora-studio-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.aurora-studio-row-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.aurora-studio-row-desc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}

.aurora-studio-row-control {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* ---------------- switch (matches host switch geometry) ---------------- */

.aurora-studio-switch {
  position: relative;
  flex: none;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  cursor: pointer;
  transition: background-color .15s ease;
}

.aurora-studio-switch[aria-checked="true"] {
  background: var(--dsw-alias-brand-primary);
}

.aurora-studio-switch:disabled {
  cursor: default;
  opacity: .5;
}

.aurora-studio-switch:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary-foreground);
  transition: transform .15s ease;
}

.aurora-studio-switch[aria-checked="false"] .aurora-studio-switch-thumb {
  background: var(--dsw-alias-switch-thumb);
}

.aurora-studio-switch[aria-checked="true"] .aurora-studio-switch-thumb {
  transform: translateX(16px);
}

/* ---------------- sliders ---------------- */

.aurora-studio-slider {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.aurora-studio-slider-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.aurora-studio-slider-label {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.aurora-studio-slider-value {
  flex: none;
  min-width: 42px;
  text-align: right;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}

.aurora-studio-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.aurora-studio-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
}

.aurora-studio-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border: 2px solid var(--dsw-alias-bg-layer-1);
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 .5px var(--dsw-alias-border-l3);
}

.aurora-studio-range:focus {
  outline: none;
}

.aurora-studio-range:focus-visible::-webkit-slider-thumb {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-range:disabled {
  cursor: default;
  opacity: .45;
}

/* ---------------- text fields ---------------- */

.aurora-studio-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aurora-studio-field-label {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}

.aurora-studio-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 12px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
}

.aurora-studio-input::placeholder {
  color: var(--dsw-alias-label-dimmed);
}

.aurora-studio-input:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-state-business-primary);
}

.aurora-studio-input[aria-invalid="true"] {
  border-color: var(--dsw-alias-state-error-primary);
}

.aurora-studio-input:disabled {
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
}

.aurora-studio-textarea {
  width: 100%;
  min-height: 84px;
  padding: 9px 12px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: vertical;
  outline: none;
  tab-size: 2;
}

.aurora-studio-textarea::placeholder {
  color: var(--dsw-alias-label-dimmed);
}

.aurora-studio-textarea:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-state-business-primary);
}

.aurora-studio-textarea[readonly] {
  cursor: text;
  color: var(--dsw-alias-label-secondary);
}

.aurora-studio-code {
  font-family: "SF Mono", "JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 19px;
}

.aurora-studio-hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}

.aurora-studio-error {
  margin: 2px 0 0;
  color: var(--dsw-alias-label-error, var(--dsw-alias-state-error-primary));
  font-size: 12px;
  line-height: 17px;
}

.aurora-studio-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}

/* ---------------- buttons ---------------- */

.aurora-studio-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .12s ease, border-color .12s ease, color .12s ease;
}

.aurora-studio-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-btn:active {
  background: var(--dsw-alias-interactive-bg-active);
}

.aurora-studio-btn:disabled {
  cursor: default;
  opacity: .5;
  background: transparent;
}

.aurora-studio-btn:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}

.aurora-studio-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}

.aurora-studio-btn-primary:hover {
  background: var(--dsw-alias-button-primary-hover);
}

.aurora-studio-btn-danger {
  border-color: var(--dsw-alias-border-l4);
  color: var(--dsw-alias-state-error-primary);
}

.aurora-studio-btn-danger:hover {
  background: var(--dsw-alias-interactive-bg-hover-danger);
}

.aurora-studio-btn-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 0 8px;
}

/* ---------------- segmented control ---------------- */

.aurora-studio-segmented {
  display: flex;
  gap: 2px;
  width: 100%;
  padding: 2px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3);
}

.aurora-studio-segmented-btn {
  flex: 1 1 0;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background-color .12s ease, color .12s ease;
}

.aurora-studio-segmented-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.aurora-studio-segmented-btn[aria-pressed="true"] {
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.aurora-studio-segmented-btn:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}

/* ---------------- theme presets ---------------- */

.aurora-studio-theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
  padding: 12px 0 10px;
}

.aurora-studio-theme-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color .12s ease, border-color .12s ease;
}

.aurora-studio-theme-card:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-theme-card.is-selected {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-theme-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-theme-swatch {
  position: relative;
  display: block;
  width: 100%;
  height: 52px;
  border-radius: var(--dsw-radius-md);
  background-color: var(--dsw-alias-bg-layer-3);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l2);
  overflow: hidden;
}

.aurora-studio-theme-accent {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-1);
}

.aurora-studio-theme-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 17px;
}

.aurora-studio-theme-card.is-selected .aurora-studio-theme-name {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

/* ---------------- accent picker ---------------- */

.aurora-studio-accent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 2px;
}

.aurora-studio-color-input {
  flex: none;
  width: 42px;
  height: 34px;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  cursor: pointer;
}

.aurora-studio-color-input::-webkit-color-swatch-wrapper {
  padding: 3px;
}

.aurora-studio-color-input::-webkit-color-swatch {
  border: 0;
  border-radius: 8px;
}

.aurora-studio-color-input:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-hex-input {
  width: 120px;
  flex: none;
}

.aurora-studio-swatches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 2px 0 10px;
}

.aurora-studio-swatch {
  width: 24px;
  height: 24px;
  flex: none;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: 50%;
  cursor: pointer;
}

.aurora-studio-swatch[aria-pressed="true"] {
  border-color: transparent;
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

.aurora-studio-swatch:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

/* ---------------- wallpaper presets ---------------- */

.aurora-studio-bg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 8px;
  padding: 12px 0 10px;
}

.aurora-studio-bg-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color .12s ease, border-color .12s ease;
}

.aurora-studio-bg-card:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-bg-card.is-selected {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-bg-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-bg-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: var(--dsw-radius-sm);
  background-color: var(--dsw-alias-bg-layer-3);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l2);
}

.aurora-studio-bg-name {
  padding: 0 2px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 16px;
}

.aurora-studio-bg-card.is-selected .aurora-studio-bg-name {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

/* ---------------- custom image ---------------- */

.aurora-studio-image-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0 2px;
}

.aurora-studio-image-thumb {
  flex: none;
  width: 88px;
  height: 56px;
  border-radius: var(--dsw-radius-md);
  background-color: var(--dsw-alias-bg-layer-3);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 .5px var(--dsw-alias-border-l3);
}

.aurora-studio-image-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.aurora-studio-image-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
}

.aurora-studio-image-sub {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 17px;
}

.aurora-studio-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.aurora-studio-empty {
  margin: 12px 0 4px;
  padding: 12px;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

/* ---------------- pet ---------------- */

.aurora-studio-pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
  padding: 12px 0 10px;
}

.aurora-studio-pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 8px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  cursor: pointer;
  transition: background-color .12s ease, border-color .12s ease;
}

.aurora-studio-pet-card:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.aurora-studio-pet-card.is-selected {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.aurora-studio-pet-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.aurora-studio-pet-preview {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-3);
  overflow: hidden;
}

.aurora-studio-pet-name {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 17px;
}

/* ---------------- inline status ---------------- */

.aurora-studio-feedback {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 4px 0 8px;
  padding: 8px 10px;
  border: .5px solid transparent;
  border-radius: var(--dsw-radius-md);
  font-size: 12px;
  line-height: 18px;
}

.aurora-studio-feedback.is-ok {
  border-color: var(--dsw-alias-state-success-primary);
  background: transparent;
  color: var(--dsw-alias-state-success-primary);
}

.aurora-studio-feedback.is-error {
  border-color: var(--dsw-alias-state-error-primary);
  background: transparent;
  color: var(--dsw-alias-label-error, var(--dsw-alias-state-error-primary));
}

.aurora-studio-banner {
  margin: 0 0 10px;
  padding: 10px 12px;
  border: .5px solid var(--dsw-alias-state-error-primary);
  border-radius: var(--dsw-radius-lg);
  background: transparent;
  color: var(--dsw-alias-label-error, var(--dsw-alias-state-error-primary));
  font-size: 12px;
  line-height: 18px;
}

.aurora-studio-kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  margin: 0 2px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-family: "SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

/* ---------------- responsive / motion ---------------- */

@media (max-width: 520px) {
  .aurora-studio-section {
    padding: 12px 12px 6px;
  }

  .aurora-studio-theme-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }

  .aurora-studio-hex-input {
    flex: 1 1 auto;
    width: auto;
  }
}

@keyframes aurora-studio-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .35; }
}

@keyframes aurora-studio-enter {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-studio-panel,
  .aurora-studio-live-dot {
    animation: none !important;
  }

  .aurora-studio-tab,
  .aurora-studio-switch,
  .aurora-studio-switch-thumb,
  .aurora-studio-btn {
    transition: none !important;
  }
}

/* The Advanced tab's animations toggle disables our own studio motion too. */
.aurora-studio-root[data-animations="off"] *,
.aurora-studio-root[data-animations="off"] *::before,
.aurora-studio-root[data-animations="off"] *::after {
  animation: none !important;
  transition: none !important;
}
`
