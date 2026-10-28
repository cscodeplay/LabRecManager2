const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/public/office-suite-preview.html');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LOMS — Lab Operations & Media Suite (Docs, Sheets, Slides, PDF, Media, Converter & Drive)</title>
  <style>
    :root {
      --bg-base: #0b0f19;
      --bg-surface: #111827;
      --bg-elevated: #1f2937;
      --bg-hover: #374151;
      --border-subtle: #1f2937;
      --border-strong: #374151;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-tertiary: #6b7280;
      --accent-docs: #3b82f6;
      --accent-sheets: #10b981;
      --accent-slides: #f59e0b;
      --accent-pdf: #f43f5e;
      --accent-media: #0ea5e9;
      --accent-converter: #a855f7;
      --accent-drive: #06b6d4;
      --canvas-bg: #ffffff;
      --canvas-text: #111827;
      --cell-border: #e5e7eb;
      --cell-selected: #e0f2fe;
      --cell-outline: #0284c7;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    [data-theme="light"] {
      --bg-base: #f3f4f6;
      --bg-surface: #ffffff;
      --bg-elevated: #f9fafb;
      --bg-hover: #f3f4f6;
      --border-subtle: #e5e7eb;
      --border-strong: #d1d5db;
      --text-primary: #111827;
      --text-secondary: #4b5563;
      --text-tertiary: #9ca3af;
      --canvas-bg: #ffffff;
      --canvas-text: #111827;
      --cell-border: #d1d5db;
      --cell-selected: #dbeafe;
      --cell-outline: #2563eb;
    }

    [data-theme="contrast"] {
      --bg-base: #000000;
      --bg-surface: #0a0a0a;
      --bg-elevated: #1a1a1a;
      --bg-hover: #2a2a2a;
      --border-subtle: #ffffff;
      --border-strong: #ffffff;
      --text-primary: #ffffff;
      --text-secondary: #ffff00;
      --text-tertiary: #00ffff;
      --cell-border: #000000;
      --cell-selected: #ffff99;
      --cell-outline: #000000;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* TOP APPLICATION BAR */
    header.top-app-bar {
      height: 48px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
      z-index: 50;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .suite-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .suite-icon-badge {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      color: white;
      transition: all 0.2s ease;
    }

    .badge-sheets { background: var(--accent-sheets); }
    .badge-docs { background: var(--accent-docs); }
    .badge-slides { background: var(--accent-slides); }
    .badge-pdf { background: var(--accent-pdf); }
    .badge-media { background: var(--accent-media); }
    .badge-converter { background: var(--accent-converter); }
    .badge-drive { background: var(--accent-drive); }

    .app-title-block {
      display: flex;
      flex-direction: column;
    }

    .app-name-tag {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
    }

    .doc-rename-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 600;
      padding: 2px 6px;
      outline: none;
      transition: border-color 0.15s;
      width: 320px;
    }
    .doc-rename-input:focus {
      background: var(--bg-elevated);
      border-color: var(--accent-sheets);
    }

    .status-badge-save {
      font-size: 11px;
      color: var(--accent-sheets);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-top {
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-top:hover {
      background: var(--bg-hover);
      border-color: var(--text-secondary);
    }

    .btn-accent {
      background: var(--accent-sheets);
      color: #ffffff;
      border: none;
      font-weight: 600;
    }
    .btn-accent:hover {
      opacity: 0.9;
    }

    /* MAIN APP BODY */
    .app-body-container {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* LEFT SIDEBAR: APP SELECTION RAIL */
    aside.left-app-rail {
      width: 60px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0;
      gap: 8px;
      flex-shrink: 0;
      z-index: 40;
      overflow-y: auto;
    }

    .rail-btn {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.15s;
      gap: 2px;
      flex-shrink: 0;
    }
    .rail-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
      transform: translateY(-1px);
    }
    .rail-btn.active {
      background: var(--bg-elevated);
      border-color: var(--border-strong);
      color: var(--text-primary);
    }
    .rail-btn.active::before {
      content: "";
      position: absolute;
      left: -6px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 0 4px 4px 0;
    }
    .rail-btn.active.sheets::before { background: var(--accent-sheets); }
    .rail-btn.active.docs::before { background: var(--accent-docs); }
    .rail-btn.active.slides::before { background: var(--accent-slides); }
    .rail-btn.active.pdf::before { background: var(--accent-pdf); }
    .rail-btn.active.media::before { background: var(--accent-media); }
    .rail-btn.active.converter::before { background: var(--accent-converter); }
    .rail-btn.active.drive::before { background: var(--accent-drive); }

    .rail-btn svg { width: 17px; height: 17px; }
    .rail-btn span { font-size: 8px; font-weight: 700; text-transform: uppercase; }

    .rail-divider {
      width: 28px;
      height: 1px;
      background: var(--border-subtle);
      margin: 2px 0;
      flex-shrink: 0;
    }

    /* CENTER WORKSPACE */
    .center-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      background: var(--bg-base);
    }

    /* MENUS BAR */
    .menu-bar-container {
      height: 28px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 2px;
      font-size: 12px;
      user-select: none;
      z-index: 35;
    }

    .menu-btn {
      padding: 3px 8px;
      border-radius: 4px;
      color: var(--text-secondary);
      cursor: pointer;
      position: relative;
      transition: background 0.1s;
    }
    .menu-btn:hover, .menu-btn.open {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    /* DROPDOWN MENUS & SUBMENUS */
    .menu-dropdown {
      position: absolute;
      top: 26px;
      left: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      box-shadow: var(--shadow-xl);
      min-width: 220px;
      padding: 4px;
      display: none;
      z-index: 100;
    }
    .menu-dropdown.active {
      display: block;
    }

    .menu-entry {
      padding: 6px 10px;
      border-radius: 4px;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font-size: 12px;
      position: relative;
    }
    .menu-entry:hover {
      background: var(--bg-elevated);
    }
    .menu-entry .shortcut {
      color: var(--text-tertiary);
      font-size: 10px;
      font-family: monospace;
      margin-left: 12px;
    }
    .menu-sep {
      height: 1px;
      background: var(--border-subtle);
      margin: 4px 0;
    }

    /* NESTED SUBMENUS */
    .menu-entry.has-submenu::after {
      content: "›";
      font-size: 14px;
      color: var(--text-tertiary);
    }
    .submenu-dropdown {
      position: absolute;
      left: 100%;
      top: -4px;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      box-shadow: var(--shadow-xl);
      min-width: 190px;
      padding: 4px;
      display: none;
      z-index: 101;
    }
    .menu-entry:hover > .submenu-dropdown {
      display: block;
    }

    /* MAIN TOOLBAR RIBBON */
    .toolbar-ribbon {
      height: 40px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 4px;
      flex-shrink: 0;
      overflow-x: auto;
    }

    .tool-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .tool-sep {
      width: 1px;
      height: 20px;
      background: var(--border-subtle);
      margin: 0 4px;
    }

    .tool-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.1s;
    }
    .tool-icon-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
    .tool-icon-btn.active {
      background: var(--bg-hover);
      border-color: var(--border-strong);
      color: var(--accent-sheets);
    }

    .tool-select {
      height: 28px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      border-radius: 5px;
      padding: 0 6px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }

    /* SHEETS FORMULA BAR */
    .formula-rail {
      height: 32px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 8px;
      flex-shrink: 0;
    }

    .cell-addr-box {
      width: 60px;
      height: 24px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      font-family: monospace;
    }

    .fx-tag {
      font-size: 13px;
      font-weight: 700;
      font-style: italic;
      color: var(--accent-sheets);
    }

    .formula-editor {
      flex: 1;
      height: 24px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: 4px;
      color: var(--text-primary);
      padding: 0 8px;
      font-size: 12px;
      font-family: monospace;
      outline: none;
    }
    .formula-editor:focus {
      border-color: var(--accent-sheets);
    }

    /* APP VIEW CONTAINERS */
    .view-card {
      flex: 1;
      display: none;
      overflow: hidden;
      position: relative;
    }
    .view-card.active {
      display: flex;
    }

    /* 1. LABSHEETS GRID */
    .sheets-grid-scroll {
      flex: 1;
      overflow: auto;
      background: var(--bg-base);
      position: relative;
    }

    .grid-table {
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
      background: var(--canvas-bg);
      color: var(--canvas-text);
      user-select: none;
    }

    .grid-table th {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      font-weight: 600;
      text-align: center;
      font-size: 11px;
      position: sticky;
      top: 0;
      z-index: 10;
      height: 24px;
    }

    .grid-table th.col-row-head {
      width: 44px;
      left: 0;
      z-index: 12;
      background: var(--bg-surface);
    }

    .grid-table td {
      border: 1px solid var(--cell-border);
      height: 24px;
      padding: 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: cell;
    }

    .grid-table td.cell-active {
      outline: 2px solid var(--cell-outline);
      background-color: var(--cell-selected);
      z-index: 5;
      position: relative;
    }

    /* EMBEDDED SHEET CHART OVERLAY */
    .sheet-floating-chart {
      position: absolute;
      top: 140px;
      left: 480px;
      width: 440px;
      height: 270px;
      background: var(--bg-surface);
      border: 2px solid var(--accent-sheets);
      border-radius: 10px;
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      z-index: 20;
      overflow: hidden;
      cursor: move;
    }

    .chart-header {
      height: 32px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .chart-canvas-area {
      flex: 1;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* 2. LABDOCS WORKSPACE */
    .docs-workspace {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-base);
      display: flex;
      justify-content: center;
      padding: 32px 16px;
    }

    .a4-page-canvas {
      width: 794px;
      min-height: 1123px;
      background: var(--canvas-bg);
      color: var(--canvas-text);
      box-shadow: var(--shadow-xl);
      border-radius: 4px;
      padding: 64px;
      position: relative;
      outline: none;
    }

    .a4-page-canvas h1 { font-size: 22px; margin-bottom: 12px; font-weight: 800; }
    .a4-page-canvas h2 { font-size: 16px; margin: 18px 0 8px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .a4-page-canvas p { font-size: 13px; line-height: 1.6; margin-bottom: 12px; color: #374151; }

    /* 3. LABSLIDES WORKSPACE */
    .slides-workspace {
      flex: 1;
      display: flex;
      overflow: hidden;
      background: var(--bg-base);
    }

    .slides-thumb-strip {
      width: 180px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .slide-thumb-card {
      aspect-ratio: 16 / 9;
      background: white;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      padding: 6px;
      position: relative;
      transition: all 0.15s;
    }
    .slide-thumb-card:hover { border-color: var(--text-tertiary); }
    .slide-thumb-card.active { border-color: var(--accent-slides); box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3); }

    .slide-thumb-number {
      position: absolute;
      bottom: 4px;
      left: 6px;
      font-size: 9px;
      font-weight: 800;
      color: #6b7280;
    }

    .slide-stage-pane {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
    }

    .slide-16-9-canvas {
      width: 800px;
      aspect-ratio: 16 / 9;
      background: white;
      color: #111827;
      border-radius: 8px;
      box-shadow: var(--shadow-xl);
      padding: 40px;
      display: flex;
      flex-direction: column;
      position: relative;
      outline: none;
    }

    /* 4. LABPDF STUDIO WORKSPACE */
    .pdf-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 20px;
      gap: 20px;
      background: var(--bg-base);
    }

    .pdf-tool-bar {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .pdf-page-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .pdf-page-card {
      background: var(--bg-surface);
      border: 2px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      transition: all 0.2s;
    }
    .pdf-page-card:hover {
      border-color: var(--accent-pdf);
      transform: translateY(-2px);
    }

    .pdf-thumb-preview {
      width: 140px;
      height: 198px;
      background: white;
      color: #111827;
      border-radius: 4px;
      box-shadow: var(--shadow-md);
      padding: 12px;
      font-size: 8px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease;
    }

    .watermark-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
      color: rgba(239, 68, 68, 0.25);
      transform: rotate(-35deg);
      pointer-events: none;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    /* 5. LOMS MEDIA STUDIO WORKSPACE */
    .media-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 20px;
      gap: 20px;
      background: var(--bg-base);
    }

    .media-player-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .media-stage {
      height: 240px;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      color: white;
    }

    .media-timeline-bar {
      padding: 16px;
      background: var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .scrub-track {
      width: 100%;
      height: 10px;
      background: #374151;
      border-radius: 5px;
      position: relative;
      cursor: pointer;
    }
    .scrub-selection {
      position: absolute;
      left: 15%;
      width: 55%;
      height: 100%;
      background: var(--accent-media);
      border-radius: 5px;
    }

    /* 6. UNIVERSAL CONVERTER WORKSPACE */
    .converter-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
      gap: 20px;
      background: var(--bg-base);
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }

    .converter-dropzone {
      border: 2px dashed var(--accent-converter);
      background: rgba(168, 85, 247, 0.05);
      border-radius: 16px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .converter-dropzone:hover {
      background: rgba(168, 85, 247, 0.1);
      transform: scale(1.01);
    }

    .preset-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }

    .preset-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      transition: all 0.15s;
    }
    .preset-card:hover {
      border-color: var(--accent-converter);
      background: var(--bg-elevated);
    }

    /* 7. CLOUDVAULT DRIVE WORKSPACE */
    .drive-pane {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--bg-base);
    }

    .drive-account-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .drive-file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .drive-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .drive-card:hover {
      border-color: var(--accent-drive);
      transform: translateY(-2px);
    }

    /* RIGHT SIDEBAR: CHART INSPECTOR */
    aside.right-chart-inspector {
      width: 290px;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-subtle);
      display: none;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 40;
    }
    aside.right-chart-inspector.open {
      display: flex;
    }

    .inspector-header {
      height: 38px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 700;
    }

    .inspector-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-elevated);
    }

    .inspector-tab-btn {
      flex: 1;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .inspector-tab-btn.active {
      color: var(--accent-sheets);
      border-bottom: 2px solid var(--accent-sheets);
      background: var(--bg-surface);
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .config-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .config-input {
      width: 100%;
      height: 30px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      color: var(--text-primary);
      padding: 0 8px;
      font-size: 12px;
      outline: none;
    }

    /* BOTTOM STATUS BAR */
    footer.app-status {
      height: 24px;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 11px;
      color: var(--text-secondary);
      flex-shrink: 0;
      z-index: 50;
    }

    /* TOAST NOTIFICATION */
    .toast-box {
      position: fixed;
      bottom: 32px;
      right: 20px;
      background: #1e293b;
      color: #ffffff;
      border: 1px solid #334155;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: var(--shadow-xl);
      display: none;
      align-items: center;
      gap: 8px;
      z-index: 1000;
    }
  </style>
</head>
<body data-theme="dark">

  <!-- 1. TOP APPLICATION COMMAND BAR -->
  <header class="top-app-bar">
    <div class="brand-section">
      <div class="suite-logo" onclick="switchApp('sheets')">
        <div id="active-app-badge" class="suite-icon-badge badge-sheets">S</div>
        <div class="app-title-block">
          <span id="active-app-name" class="app-name-tag">LabSheets</span>
          <input id="active-doc-title" class="doc-rename-input" value="Class 10 Term 1 Academic Performance & Budget 2026" />
        </div>
      </div>
      <div class="status-badge-save">
        <span>✓</span>
        <span>Autosaved to CloudVault</span>
      </div>
    </div>

    <div class="top-actions">
      <button class="btn-top" onclick="cycleAppTheme()" title="Switch Light / Dark / High Contrast">
        <span id="theme-btn-label">🌙 Dark Mode</span>
      </button>
      <button class="btn-top btn-accent" onclick="exportCurrentDoc()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span id="export-btn-label">Export .xlsx</span>
      </button>
      <button class="btn-top" onclick="switchApp('drive')" style="border-color: var(--accent-drive); color: var(--accent-drive);">
        <span>☁️ Google Drive 5TB</span>
      </button>
    </div>
  </header>

  <!-- 2. MAIN APPLICATION BODY (LEFT RAIL + CENTER WORKSPACE + RIGHT INSPECTOR) -->
  <div class="app-body-container">

    <!-- LEFT SIDEBAR: APP SWITCHER RAIL (LOMS) -->
    <aside class="left-app-rail">
      <!-- 1. LabSheets -->
      <button class="rail-btn sheets active" onclick="switchApp('sheets')" title="LabSheets — Spreadsheet & Analytics">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
        <span>Sheets</span>
      </button>

      <!-- 2. LabDocs -->
      <button class="rail-btn docs" onclick="switchApp('docs')" title="LabDocs — Academic Word Processor">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Docs</span>
      </button>

      <!-- 3. LabSlides (PPT) -->
      <button class="rail-btn slides" onclick="switchApp('slides')" title="LabSlides — Slide Decks & Presentations">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
        <span>Slides</span>
      </button>

      <div class="rail-divider"></div>

      <!-- 4. LabPDF Studio -->
      <button class="rail-btn pdf" onclick="switchApp('pdf')" title="LabPDF Studio — Merge, Reorganize, Rotate & Split">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span>PDF</span>
      </button>

      <!-- 5. LOMS Media Studio -->
      <button class="rail-btn media" onclick="switchApp('media')" title="LOMS Media Studio — Video, Audio & Image Suite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="15" x="2" y="4" rx="2"/><path d="m10 9 5 3-5 3v-6Z"/></svg>
        <span>Media</span>
      </button>

      <!-- 6. Universal Converter -->
      <button class="rail-btn converter" onclick="switchApp('converter')" title="Universal File Converter — 50+ Formats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
        <span>Convert</span>
      </button>

      <div class="rail-divider"></div>

      <!-- 7. CloudVault (Google Drive) -->
      <button class="rail-btn drive" onclick="switchApp('drive')" title="CloudVault — Google Drive 5TB Connected Storage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
        <span>Drive</span>
      </button>
    </aside>

    <!-- CENTER WORKSPACE -->
    <div class="center-workspace">

      <!-- MENUS BAR WITH NESTED SUBMENUS -->
      <nav class="menu-bar-container">
        <!-- 1. FILE MENU -->
        <div class="menu-btn" onclick="toggleMenu('file-menu')">
          File
          <div id="file-menu" class="menu-dropdown">
            <div class="menu-entry has-submenu">
              New
              <div class="submenu-dropdown">
                <div class="menu-entry" onclick="switchApp('docs'); triggerToast('New LabDoc created')">📄 Document (LabDocs)</div>
                <div class="menu-entry" onclick="switchApp('sheets'); triggerToast('New LabSheet created')">📊 Spreadsheet (LabSheets)</div>
                <div class="menu-entry" onclick="switchApp('slides'); triggerToast('New LabSlide created')">📽️ Presentation (LabSlides)</div>
                <div class="menu-entry" onclick="switchApp('pdf'); triggerToast('Opened PDF Studio')">📑 LabPDF Studio (Merge & Reorder)</div>
                <div class="menu-entry" onclick="switchApp('media'); triggerToast('Opened Media Studio')">🎬 Media Studio (Video/Audio)</div>
                <div class="menu-entry" onclick="switchApp('converter'); triggerToast('Opened Universal Converter')">🔄 Universal Converter</div>
              </div>
            </div>
            <div class="menu-entry" onclick="switchApp('drive')">📂 Open from Google Drive... <span class="shortcut">Cmd+O</span></div>
            <div class="menu-entry" onclick="triggerToast('Copied document')">💾 Make a Copy...</div>
            <div class="menu-sep"></div>
            <div class="menu-entry has-submenu">
              Download / Export
              <div class="submenu-dropdown">
                <div class="menu-entry" onclick="exportCurrentDoc()">Microsoft Excel (.xlsx)</div>
                <div class="menu-entry" onclick="exportCurrentDoc()">Microsoft Word (.docx)</div>
                <div class="menu-entry" onclick="exportCurrentDoc()">PowerPoint (.pptx)</div>
                <div class="menu-entry" onclick="exportCurrentDoc()">Portable Document (.pdf)</div>
                <div class="menu-entry" onclick="exportCurrentDoc()">Comma-Separated (.csv)</div>
              </div>
            </div>
            <div class="menu-entry" onclick="window.print()">🖨️ Print... <span class="shortcut">Cmd+P</span></div>
          </div>
        </div>

        <!-- 2. EDIT MENU -->
        <div class="menu-btn" onclick="toggleMenu('edit-menu')">
          Edit
          <div id="edit-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="triggerToast('Undo')">Undo <span class="shortcut">Cmd+Z</span></div>
            <div class="menu-entry" onclick="triggerToast('Redo')">Redo <span class="shortcut">Cmd+Shift+Z</span></div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="triggerToast('Cut')">Cut <span class="shortcut">Cmd+X</span></div>
            <div class="menu-entry" onclick="triggerToast('Copied')">Copy <span class="shortcut">Cmd+C</span></div>
            <div class="menu-entry" onclick="triggerToast('Pasted')">Paste <span class="shortcut">Cmd+V</span></div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="triggerToast('Find & Replace dialog')">Find and Replace... <span class="shortcut">Cmd+F</span></div>
          </div>
        </div>

        <!-- 3. VIEW MENU -->
        <div class="menu-btn" onclick="toggleMenu('view-menu')">
          View
          <div id="view-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="cycleAppTheme()">Theme Toggle (Light/Dark/Contrast)</div>
            <div class="menu-entry" onclick="openChartInspector()">Toggle Chart Inspector Panel</div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="triggerToast('Zoom set to 100%')">Zoom: 100%</div>
            <div class="menu-entry" onclick="triggerToast('Zoom set to 150%')">Zoom: 150%</div>
            <div class="menu-entry" onclick="triggerToast('Toggled Fullscreen')">Full Screen <span class="shortcut">F11</span></div>
          </div>
        </div>

        <!-- 4. INSERT MENU -->
        <div class="menu-btn" onclick="toggleMenu('insert-menu')">
          Insert
          <div id="insert-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="openChartInspector()">📊 Chart (11+ Families)...</div>
            <div class="menu-entry has-submenu">
              Image
              <div class="submenu-dropdown">
                <div class="menu-entry" onclick="triggerToast('Upload dialog opened')">Upload from Device</div>
                <div class="menu-entry" onclick="switchApp('drive')">Insert from Google Drive</div>
                <div class="menu-entry" onclick="triggerToast('Web URL prompt')">Insert by URL...</div>
              </div>
            </div>
            <div class="menu-entry" onclick="promptMathFormula()">📐 Math Equation (KaTeX / LaTeX)...</div>
          </div>
        </div>

        <!-- 5. SLIDE MENU (Visible in LabSlides) -->
        <div class="menu-btn" id="menu-slide-root" style="display: none;" onclick="toggleMenu('slide-menu')">
          Slide
          <div id="slide-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="addNewSlide()">➕ New Slide <span class="shortcut">Ctrl+M</span></div>
            <div class="menu-entry" onclick="duplicateCurrentSlide()">📑 Duplicate Slide</div>
            <div class="menu-entry" onclick="deleteCurrentSlide()">🗑️ Delete Slide</div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="triggerToast('Changed Layout to Title & Two Columns')">Change Layout...</div>
            <div class="menu-entry" onclick="startSlideShow()">▶️ Present from Beginning <span class="shortcut">Cmd+Enter</span></div>
          </div>
        </div>

        <!-- 6. DATA MENU (Visible in LabSheets) -->
        <div class="menu-btn" id="menu-data-root" onclick="toggleMenu('data-menu')">
          Data
          <div id="data-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="triggerToast('Sorted range A to Z')">Sort Sheet by Column A (A → Z)</div>
            <div class="menu-entry" onclick="triggerToast('Sorted range Z to A')">Sort Sheet by Column A (Z → A)</div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="triggerToast('Created Filter Views')">Create a Filter</div>
            <div class="menu-entry" onclick="triggerToast('Data Validation opened')">Data Validation...</div>
          </div>
        </div>

        <!-- 7. TOOLS MENU -->
        <div class="menu-btn" onclick="toggleMenu('tools-menu')">
          Tools
          <div id="tools-menu" class="menu-dropdown">
            <div class="menu-entry" onclick="switchApp('converter')">🔄 Universal File Converter (50+ Formats)</div>
            <div class="menu-entry" onclick="switchApp('pdf')">📑 LabPDF Studio (Merge, Rotate, Split)</div>
            <div class="menu-entry" onclick="switchApp('media')">🎬 LOMS Media Studio (Video, Audio, Image)</div>
            <div class="menu-sep"></div>
            <div class="menu-entry" onclick="switchApp('drive')">☁️ CloudVault Google Drive Manager (5TB)</div>
          </div>
        </div>
      </nav>

      <!-- FORMATTING TOOLBAR RIBBON -->
      <div class="toolbar-ribbon">
        <div class="tool-group">
          <button class="tool-icon-btn" onclick="triggerToast('Undo')">↩</button>
          <button class="tool-icon-btn" onclick="triggerToast('Redo')">↪</button>
          <button class="tool-icon-btn" onclick="window.print()">🖨</button>
        </div>

        <div class="tool-sep"></div>

        <div class="tool-group">
          <select class="tool-select" style="width: 110px;" onchange="applyFormat('font-family')">
            <option>Arial</option>
            <option>Calibri</option>
            <option>Inter</option>
            <option>Times New Roman</option>
            <option>KaTeX Math</option>
          </select>
          <select class="tool-select" style="width: 50px;" onchange="applyFormat('font-size')">
            <option>10</option>
            <option selected>11</option>
            <option>12</option>
            <option>14</option>
            <option>18</option>
            <option>24</option>
          </select>
        </div>

        <div class="tool-sep"></div>

        <div class="tool-group">
          <button class="tool-icon-btn active" onclick="toggleFormat('bold')">B</button>
          <button class="tool-icon-btn" onclick="toggleFormat('italic')">I</button>
          <button class="tool-icon-btn" onclick="toggleFormat('underline')">U</button>
          <button class="tool-icon-btn" onclick="toggleFormat('strike')">S</button>
        </div>

        <div class="tool-sep"></div>

        <!-- NUMBER FORMATTING (SHEETS ONLY) -->
        <div class="tool-group" id="ribbon-sheets-num-group">
          <button class="tool-icon-btn" onclick="applyFormat('indian_currency')" title="Indian Rupees (₹ 1,50,000.00)">₹</button>
          <button class="tool-icon-btn" onclick="applyFormat('percentage')" title="Percent (%)">%</button>
          <button class="tool-icon-btn" onclick="applyFormat('indian_lakhs')" title="Indian Lakhs / Crores System">Lakhs</button>
          <button class="tool-icon-btn" onclick="applyFormat('decimal-inc')" title="Increase Decimals">.00→</button>
          <button class="tool-icon-btn" onclick="applyFormat('decimal-dec')" title="Decrease Decimals">.0←</button>
        </div>

        <!-- CHART INSERT BUTTON -->
        <div class="tool-group" id="ribbon-chart-btn-group">
          <div class="tool-sep"></div>
          <button class="btn-top" onclick="openChartInspector()" style="height: 28px; padding: 0 8px; border-color: var(--accent-sheets); color: var(--accent-sheets);">
            <span>📊 Insert Chart</span>
          </button>
        </div>

        <!-- DOCS TEMPLATE PICKER -->
        <div class="tool-group" id="ribbon-docs-tpl-group" style="display: none;">
          <div class="tool-sep"></div>
          <button class="btn-top" onclick="instantiateTemplatePrompt()" style="height: 28px; padding: 0 8px; border-color: var(--accent-docs); color: var(--accent-docs);">
            <span>📑 Insert CBSE Exam Template</span>
          </button>
        </div>

        <!-- SLIDES PRESENT BUTTON -->
        <div class="tool-group" id="ribbon-slides-group" style="display: none;">
          <div class="tool-sep"></div>
          <button class="btn-top" onclick="addNewSlide()" style="height: 28px; padding: 0 8px; background: var(--accent-slides); color: white; border: none;">
            <span>➕ New Slide</span>
          </button>
          <button class="btn-top" onclick="startSlideShow()" style="height: 28px; padding: 0 8px; border-color: var(--accent-slides); color: var(--accent-slides);">
            <span>▶️ Present</span>
          </button>
        </div>
      </div>

      <!-- SHEETS FORMULA RAIL -->
      <div class="formula-rail" id="sheets-formula-bar-rail">
        <div class="cell-addr-box" id="formula-cell-addr">B2</div>
        <div class="fx-tag">fx</div>
        <input class="formula-editor" id="formula-bar-input" value="85" placeholder="Enter a value or formula (=SUM, =AVERAGE, =IF...)" />
      </div>

      <!-- VIEW 1: LABSHEETS SPREADSHEET CANVAS -->
      <div id="view-sheets" class="view-card active">
        <div class="sheets-grid-scroll">
          <table class="grid-table" id="main-matrix-grid">
            <thead>
              <tr id="matrix-header-row">
                <th class="col-row-head">◢</th>
              </tr>
            </thead>
            <tbody id="matrix-body">
              <!-- Grid populated via JS -->
            </tbody>
          </table>

          <!-- FLOATING SVG CHART -->
          <div class="sheet-floating-chart" id="floating-chart-box" onclick="openChartInspector()">
            <div class="chart-header">
              <span id="chart-display-title">Physics vs Chemistry Performance</span>
              <span style="font-size: 10px; color: var(--accent-sheets);">● Dynamic 2-Way Bound</span>
            </div>
            <div class="chart-canvas-area" id="svg-chart-container">
              <!-- SVG chart rendered via JS -->
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: LABDOCS WORD PROCESSOR -->
      <div id="view-docs" class="view-card">
        <div class="docs-workspace">
          <div class="a4-page-canvas" contenteditable="true" id="doc-a4-editor">
            <h1>DELHI PUBLIC SCHOOL — SENIOR SECONDARY</h1>
            <h2 style="color: #4b5563; font-size: 14px; font-weight: 600;">Department of Physics | Term 1 Practical Assessment & Investigation</h2>
            <p><strong>Candidate Name:</strong> Aarav Sharma &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; <strong>Roll No:</strong> 12104 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; <strong>Date:</strong> 24-Oct-2026</p>
            <hr style="border: 0; border-top: 1.5px solid #111827; margin: 16px 0;" />
            <h2>Experiment 3: Verification of Ohm's Law and Internal Resistance</h2>
            <p><strong>Theoretical Principle:</strong> Ohm's law states that the current flowing through a conductor between two points is directly proportional to the voltage across the two points, provided physical conditions such as temperature remain constant.</p>
            
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px; font-family: monospace; font-size: 13px;">
              V = I \\cdot R \\quad \\implies \\quad R = \\frac{V}{I}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; text-align: left;">
              <tr style="background: #f1f5f9; font-weight: 700;">
                <td style="border: 1px solid #cbd5e1; padding: 6px;">Trial #</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">Volts (V)</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">Current (A)</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">Resistance R (Ω)</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">1</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">1.50 V</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">0.30 A</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">5.00 Ω</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">2</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">3.00 V</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">0.60 A</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">5.00 Ω</td>
              </tr>
            </table>

            <div style="position: absolute; bottom: 24px; left: 64px; right: 64px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between;">
              <span>Document Ref: DPS/PHY/2026/04</span>
              <span>Page 1 of 2</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 3: LABSLIDES (PPT) -->
      <div id="view-slides" class="view-card">
        <div class="slides-workspace">
          <!-- Slide Thumbnails Strip -->
          <div class="slides-thumb-strip">
            <div class="slide-thumb-card active" onclick="selectSlide(1)">
              <div style="font-size: 8px; font-weight: 700; color: #111827;">Slide 1: Title</div>
              <div style="font-size: 6px; color: #4b5563; margin-top: 4px;">Electromagnetic Induction</div>
              <span class="slide-thumb-number">1</span>
            </div>
            <div class="slide-thumb-card" onclick="selectSlide(2)">
              <div style="font-size: 8px; font-weight: 700; color: #111827;">Slide 2: Objectives</div>
              <div style="font-size: 6px; color: #4b5563; margin-top: 4px;">Faraday's Laws & Lenz's Law</div>
              <span class="slide-thumb-number">2</span>
            </div>
            <div class="slide-thumb-card" onclick="selectSlide(3)">
              <div style="font-size: 8px; font-weight: 700; color: #111827;">Slide 3: Apparatus</div>
              <div style="font-size: 6px; color: #4b5563; margin-top: 4px;">Coil, Bar Magnet, Galvanometer</div>
              <span class="slide-thumb-number">3</span>
            </div>
            <div class="slide-thumb-card" onclick="selectSlide(4)">
              <div style="font-size: 8px; font-weight: 700; color: #111827;">Slide 4: Key Results</div>
              <div style="font-size: 6px; color: #4b5563; margin-top: 4px;">Induced EMF & Deflection Graphs</div>
              <span class="slide-thumb-number">4</span>
            </div>
          </div>

          <!-- Central 16:9 Presentation Stage -->
          <div class="slide-stage-pane">
            <div class="slide-16-9-canvas" contenteditable="true" id="current-slide-canvas">
              <h1 id="slide-heading-text">Electromagnetic Induction & Faraday's Laws</h1>
              <p id="slide-body-text">An in-depth presentation on magnetic flux dynamics, induced electromotive force, and Lenz's direction law for secondary coils.</p>
              <div style="margin-top: 24px; display: flex; gap: 12px;">
                <span style="font-size: 12px; background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 4px; font-weight: 600;">Physics Dept</span>
                <span style="font-size: 12px; background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 4px; font-weight: 600;">Lab Seminar 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 4: LABPDF STUDIO -->
      <div id="view-pdf" class="view-card">
        <div class="pdf-workspace">
          <!-- Action Bar -->
          <div class="pdf-tool-bar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--accent-pdf); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">PDF</div>
              <div>
                <h3 style="font-size: 14px; font-weight: 700;">LabPDF Studio — Document Organizer & Merger</h3>
                <p style="font-size: 11px; color: var(--text-secondary);">Reorder pages, rotate CW/CCW, watermark, and extract ranges without external servers</p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="text" id="pdf-watermark-text" class="config-input" placeholder="Watermark (e.g. CONFIDENTIAL)" style="width: 180px;" oninput="updatePdfWatermark(this.value)" />
              <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="pdf-page-num-toggle" checked onchange="togglePdfPageNums(this.checked)" /> Page Numbers
              </label>
              <button class="btn-top btn-accent" style="background: var(--accent-pdf);" onclick="triggerToast('Saved & Exported Reorganized PDF')">
                <span>Save & Export PDF</span>
              </button>
            </div>
          </div>

          <!-- Multi-File PDF Merge Section -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--accent-pdf);">Multi-File PDF Merge Queue (3 Files Loaded)</span>
              <button class="btn-top" onclick="triggerToast('Combined 3 PDF files into unified student lab manual')">⚡ Merge All Files</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
                <span>1. CBSE_Class12_Physics_Syllabus.pdf (4 pages • 820 KB)</span>
                <span style="color: var(--accent-sheets);">Ready</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
                <span>2. Experiment_03_Ohm_Law_Manual.pdf (2 pages • 410 KB)</span>
                <span style="color: var(--accent-sheets);">Ready</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
                <span>3. Teacher_Assessment_Rubric_2026.pdf (1 page • 190 KB)</span>
                <span style="color: var(--accent-sheets);">Ready</span>
              </div>
            </div>
          </div>

          <!-- Visual Page Rearrangement Grid -->
          <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-top: 6px;">Visual Page Arrangement & Orientation (Click Rotate to test)</h4>
          <div class="pdf-page-grid" id="pdf-cards-container">
            <!-- Page Card 1 -->
            <div class="pdf-page-card" id="pdf-card-1">
              <div class="pdf-thumb-preview" id="pdf-thumb-1">
                <div class="watermark-overlay" id="wm-1">SAMPLE</div>
                <strong style="font-size: 9px; margin-bottom: 4px;">Page 1: Title & Index</strong>
                <p style="font-size: 7px; color: #4b5563;">Class 12 Senior Physics Laboratory Guide & Syllabus Outline 2026</p>
                <div style="margin-top: auto; font-size: 7px; text-align: center; color: #9ca3af;" class="pg-num-lbl">Page 1</div>
              </div>
              <div style="display: flex; gap: 4px; margin-top: 10px;">
                <button class="tool-icon-btn" onclick="rotatePdfCard(1, 90)" title="Rotate CW 90°">⟳</button>
                <button class="tool-icon-btn" onclick="rotatePdfCard(1, -90)" title="Rotate CCW 90°">⟲</button>
                <button class="tool-icon-btn" onclick="triggerToast('Duplicated Page 1')" title="Duplicate">📑</button>
                <button class="tool-icon-btn" onclick="deletePdfCard(1)" title="Delete">🗑</button>
              </div>
            </div>

            <!-- Page Card 2 -->
            <div class="pdf-page-card" id="pdf-card-2">
              <div class="pdf-thumb-preview" id="pdf-thumb-2">
                <div class="watermark-overlay" id="wm-2">SAMPLE</div>
                <strong style="font-size: 9px; margin-bottom: 4px;">Page 2: Ohm's Law Theory</strong>
                <p style="font-size: 7px; color: #4b5563;">Mathematical derivation of resistance formula and circuit conditions</p>
                <div style="margin-top: auto; font-size: 7px; text-align: center; color: #9ca3af;" class="pg-num-lbl">Page 2</div>
              </div>
              <div style="display: flex; gap: 4px; margin-top: 10px;">
                <button class="tool-icon-btn" onclick="rotatePdfCard(2, 90)">⟳</button>
                <button class="tool-icon-btn" onclick="rotatePdfCard(2, -90)">⟲</button>
                <button class="tool-icon-btn" onclick="triggerToast('Duplicated Page 2')">📑</button>
                <button class="tool-icon-btn" onclick="deletePdfCard(2)">🗑</button>
              </div>
            </div>

            <!-- Page Card 3 -->
            <div class="pdf-page-card" id="pdf-card-3">
              <div class="pdf-thumb-preview" id="pdf-thumb-3">
                <div class="watermark-overlay" id="wm-3">SAMPLE</div>
                <strong style="font-size: 9px; margin-bottom: 4px;">Page 3: Circuit Schematic</strong>
                <p style="font-size: 7px; color: #4b5563;">High-resolution schematic wiring diagram for voltmeter and ammeter</p>
                <div style="margin-top: auto; font-size: 7px; text-align: center; color: #9ca3af;" class="pg-num-lbl">Page 3</div>
              </div>
              <div style="display: flex; gap: 4px; margin-top: 10px;">
                <button class="tool-icon-btn" onclick="rotatePdfCard(3, 90)">⟳</button>
                <button class="tool-icon-btn" onclick="rotatePdfCard(3, -90)">⟲</button>
                <button class="tool-icon-btn" onclick="triggerToast('Duplicated Page 3')">📑</button>
                <button class="tool-icon-btn" onclick="deletePdfCard(3)">🗑</button>
              </div>
            </div>

            <!-- Page Card 4 -->
            <div class="pdf-page-card" id="pdf-card-4">
              <div class="pdf-thumb-preview" id="pdf-thumb-4">
                <div class="watermark-overlay" id="wm-4">SAMPLE</div>
                <strong style="font-size: 9px; margin-bottom: 4px;">Page 4: Observation Matrix</strong>
                <p style="font-size: 7px; color: #4b5563;">Tabulated trial voltage and current values with error calculation</p>
                <div style="margin-top: auto; font-size: 7px; text-align: center; color: #9ca3af;" class="pg-num-lbl">Page 4</div>
              </div>
              <div style="display: flex; gap: 4px; margin-top: 10px;">
                <button class="tool-icon-btn" onclick="rotatePdfCard(4, 90)">⟳</button>
                <button class="tool-icon-btn" onclick="rotatePdfCard(4, -90)">⟲</button>
                <button class="tool-icon-btn" onclick="triggerToast('Duplicated Page 4')">📑</button>
                <button class="tool-icon-btn" onclick="deletePdfCard(4)">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 5: LOMS MEDIA STUDIO -->
      <div id="view-media" class="view-card">
        <div class="media-workspace">
          <!-- Top Media Bar -->
          <div class="pdf-tool-bar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--accent-media); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">FF</div>
              <div>
                <h3 style="font-size: 14px; font-weight: 700;">LOMS Media Studio — Video, Audio & Image Suite</h3>
                <p style="font-size: 11px; color: var(--text-secondary);">Powered by local FFmpeg 7.1.1 — Sub-second hardware transcode, clipping, compression & audio extraction</p>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn-top active" style="border-color: var(--accent-media); color: var(--accent-media);">🎬 Video Studio</button>
              <button class="btn-top" onclick="triggerToast('Audio Studio activated')">🎵 Audio Studio</button>
              <button class="btn-top" onclick="triggerToast('Image Studio activated')">🖼️ Image Studio</button>
            </div>
          </div>

          <!-- Video Player & Clipper Timeline -->
          <div class="media-player-box">
            <div class="media-stage">
              <div style="text-align: center;">
                <div style="font-size: 36px; margin-bottom: 8px;">▶</div>
                <div style="font-size: 13px; font-weight: 700;">Physics_Double_Slit_Interference_4K.mp4</div>
                <div style="font-size: 11px; color: #9ca3af;">00:08.50 / 00:45.00 • 3840x2160 (60fps)</div>
              </div>
            </div>

            <!-- Scrubber Timeline & Trimming Controls -->
            <div class="media-timeline-bar">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                <span>Start: <strong id="clip-start-val" style="color: var(--accent-media);">00:06.00</strong></span>
                <span>Timeline Scrubber (Drag or click markers)</span>
                <span>End: <strong id="clip-end-val" style="color: var(--accent-media);">00:32.00</strong> (Duration: 26.0s)</span>
              </div>

              <div class="scrub-track" onclick="triggerToast('Scrubbed timeline playhead')">
                <div class="scrub-selection"></div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; gap: 8px;">
                  <button class="btn-top" onclick="triggerToast('Marked In point at current playhead')">Set In [</button>
                  <button class="btn-top" onclick="triggerToast('Marked Out point at current playhead')">Set Out ]</button>
                  <button class="btn-top btn-accent" style="background: var(--accent-media);" onclick="triggerToast('Clipped 26.0s video with keyframe accuracy')">✂ Clip & Trim Segment</button>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn-top" onclick="triggerToast('Extracted high-fidelity 320kbps MP3 audio track from video')">🎵 Extract Audio (MP3)</button>
                  <button class="btn-top" onclick="triggerToast('Generated high-palette animated GIF from selected 26s')">🎞️ Convert to Animated GIF</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Smart Compressor & Format Converter Controls -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px;">
              <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--accent-media); margin-bottom: 8px;">Hardware-Accelerated Compressor</h4>
              <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">Reduce file size for web lectures and student downloads</p>
              
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span>Compression Level (CRF 28)</span>
                  <span style="color: var(--accent-sheets); font-weight: 700;">Est: 48.2 MB → 14.6 MB (-70%)</span>
                </div>
                <input type="range" min="18" max="36" value="28" style="width: 100%; accent-color: var(--accent-media);" oninput="triggerToast('CRF adjusted to ' + this.value)" />
              </div>

              <button class="btn-top btn-accent" style="background: var(--accent-media); width: 100%; justify-content: center;" onclick="triggerToast('Started media compression job')">⚡ Compress Video Now</button>
            </div>

            <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px;">
              <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--accent-media); margin-bottom: 8px;">Format Transcoder</h4>
              <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">Transcode across WebM, MP4, MKV, MP3, WAV, WebP, etc.</p>

              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <select class="config-input" style="flex: 1;">
                  <option>MP4 (H.264 / AAC - Universal)</option>
                  <option>WebM (VP9 / Opus - Lightweight)</option>
                  <option>MKV (Matroska Container)</option>
                  <option>MP3 (Audio Only - 320 kbps)</option>
                  <option>WAV (PCM Uncompressed Audio)</option>
                </select>
              </div>

              <button class="btn-top" style="width: 100%; justify-content: center; border-color: var(--accent-media); color: var(--accent-media);" onclick="triggerToast('Transcoding media stream...')">🔄 Convert Format</button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 6: UNIVERSAL CONVERTER -->
      <div id="view-converter" class="view-card">
        <div class="converter-workspace">
          <div class="pdf-tool-bar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--accent-converter); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">UC</div>
              <div>
                <h3 style="font-size: 14px; font-weight: 700;">Universal File Converter — 50+ Formats Supported</h3>
                <p style="font-size: 11px; color: var(--text-secondary);">Direct conversions across Documents, Spreadsheets, Presentations, Audio, Video & Images</p>
              </div>
            </div>
            <button class="btn-top" onclick="triggerToast('History Refreshed')">🔄 Refresh Jobs</button>
          </div>

          <!-- Quick Presets -->
          <div>
            <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 8px;">Popular Academic Conversion Presets</h4>
            <div class="preset-card-grid">
              <div class="preset-card" onclick="triggerToast('Applied Word → PDF conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">📝 ➔ 📄</span>
                <strong style="font-size: 12px;">Word to PDF</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">DOCX → PDF</span>
              </div>
              <div class="preset-card" onclick="triggerToast('Applied Excel → PDF conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">📊 ➔ 📄</span>
                <strong style="font-size: 12px;">Excel to PDF</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">XLSX → PDF</span>
              </div>
              <div class="preset-card" onclick="triggerToast('Applied PPT → PDF conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">📽️ ➔ 📄</span>
                <strong style="font-size: 12px;">Slides to PDF</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">PPTX → PDF</span>
              </div>
              <div class="preset-card" onclick="triggerToast('Applied Video → MP4 conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">🎬 ➔ 🎞️</span>
                <strong style="font-size: 12px;">Video to MP4</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">MKV/MOV → MP4</span>
              </div>
              <div class="preset-card" onclick="triggerToast('Applied Audio → MP3 conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">🎵 ➔ 🎧</span>
                <strong style="font-size: 12px;">Audio to MP3</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">WAV/AAC → MP3</span>
              </div>
              <div class="preset-card" onclick="triggerToast('Applied Image → WebP conversion preset')">
                <span style="font-size: 18px; margin-bottom: 4px;">🖼️ ➔ ⚡</span>
                <strong style="font-size: 12px;">Image to WebP</strong>
                <span style="font-size: 10px; color: var(--text-tertiary);">PNG/JPG → WebP</span>
              </div>
            </div>
          </div>

          <!-- Drag & Drop Zone -->
          <div class="converter-dropzone" onclick="triggerToast('File picker opened for conversion')">
            <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">Click or Drag & Drop Any File to Convert</strong>
            <p style="font-size: 12px; color: var(--text-secondary);">Supports up to 250 MB — DOCX, XLSX, PPTX, PDF, HTML, MP4, MKV, MP3, PNG, JPG, and 40+ more</p>
          </div>

          <!-- Recent Conversion Jobs -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px;">
            <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Recent Completed Conversions</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
                <span>Physics_Experiment_03_Ohm_Law.docx → <strong>Physics_Experiment_03_Ohm_Law.pdf</strong> (1.4 MB)</span>
                <div style="display: flex; gap: 6px;">
                  <button class="btn-top" onclick="triggerToast('Downloaded converted PDF')">⬇ Download</button>
                  <button class="btn-top" onclick="triggerToast('Saved to Lab Documents repository')">💾 Save to Repo</button>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
                <span>Double_Slit_Seminar_Recording.mov → <strong>Double_Slit_Seminar_Recording.mp4</strong> (18.2 MB)</span>
                <div style="display: flex; gap: 6px;">
                  <button class="btn-top" onclick="triggerToast('Downloaded converted MP4')">⬇ Download</button>
                  <button class="btn-top" onclick="triggerToast('Saved to Lab Documents repository')">💾 Save to Repo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 7: CLOUDVAULT (GOOGLE DRIVE) -->
      <div id="view-drive" class="view-card">
        <div class="drive-pane">
          <div class="drive-account-card">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: #0284c7; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">☁️</div>
              <div>
                <h3 style="font-size: 15px; font-weight: 700;">Google Drive Account: charan881130@gmail.com</h3>
                <p style="font-size: 12px; color: var(--text-secondary);">OAuth 2.0 User Token Restored • 5.0 TB Institutional High-Speed Storage</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 12px; font-weight: 700; color: var(--accent-sheets);">● Connected & Synced</span>
              <div style="font-size: 11px; color: var(--text-tertiary);">Quota: 12.4 GB / 5,000 GB used</div>
            </div>
          </div>

          <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Select any Google Drive file to open in LOMS Suite:</h4>

          <div class="drive-file-grid">
            <div class="drive-card" onclick="openDriveAsset('sheets')">
              <span style="font-size: 24px;">📊</span>
              <strong style="font-size: 13px;">Class 10 CBSE Final Term Marks & Gradebook.gsheet</strong>
              <span style="font-size: 11px; color: var(--text-secondary);">Google Sheets • 4 Worksheets • 45 Students</span>
              <button class="btn-top" style="border-color: var(--accent-sheets); color: var(--accent-sheets); margin-top: auto;">Open in LabSheets</button>
            </div>

            <div class="drive-card" onclick="openDriveAsset('docs')">
              <span style="font-size: 24px;">📄</span>
              <strong style="font-size: 13px;">CBSE Class 12 Physics Mid-Term Examination 2026.gdoc</strong>
              <span style="font-size: 11px; color: var(--text-secondary);">Google Docs • 3 Pages • Full Marking Key</span>
              <button class="btn-top" style="border-color: var(--accent-docs); color: var(--accent-docs); margin-top: auto;">Open in LabDocs</button>
            </div>

            <div class="drive-card" onclick="openDriveAsset('slides')">
              <span style="font-size: 24px;">📽️</span>
              <strong style="font-size: 13px;">Optics & Wave Motion Seminar Deck.gslides</strong>
              <span style="font-size: 11px; color: var(--text-secondary);">Google Slides • 18 Widescreen Slides</span>
              <button class="btn-top" style="border-color: var(--accent-slides); color: var(--accent-slides); margin-top: auto;">Open in LabSlides</button>
            </div>

            <div class="drive-card" onclick="openDriveAsset('sheets')">
              <span style="font-size: 24px;">📊</span>
              <strong style="font-size: 13px;">Annual Science Lab Budget & Orders 2026-27.xlsx</strong>
              <span style="font-size: 11px; color: var(--text-secondary);">Microsoft Excel • ₹ 14.5 Lakhs Budget</span>
              <button class="btn-top" style="border-color: var(--accent-sheets); color: var(--accent-sheets); margin-top: auto;">Open in LabSheets</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT SIDEBAR: CHART CONFIGURATION INSPECTOR -->
    <aside id="chart-right-inspector" class="right-chart-inspector">
      <div class="inspector-header">
        <span>📊 Chart Configuration Inspector</span>
        <button class="tool-icon-btn" onclick="closeChartInspector()">✕</button>
      </div>

      <div class="inspector-tabs">
        <button class="inspector-tab-btn active" id="tab-btn-setup" onclick="setInspectorTab('setup')">SETUP</button>
        <button class="inspector-tab-btn" id="tab-btn-customize" onclick="setInspectorTab('customize')">CUSTOMIZE</button>
      </div>

      <div class="inspector-body" id="inspector-setup-panel">
        <div>
          <div class="config-label">Chart Family (11 Families)</div>
          <select class="config-input" id="inspector-chart-type" onchange="updateChartFromInspector()">
            <option value="column">Clustered Column</option>
            <option value="stacked_column">Stacked Column</option>
            <option value="bar">Clustered Bar</option>
            <option value="line">Line with Markers</option>
            <option value="spline">Smooth Spline</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="doughnut">Doughnut Chart</option>
            <option value="scatter">XY Scatter & Trendline</option>
            <option value="radar">Radar / Spider Matrix</option>
            <option value="combo">Combo (Column + Line)</option>
          </select>
        </div>

        <div>
          <div class="config-label">Data Range</div>
          <input class="config-input" id="inspector-data-range" value="A1:C4" oninput="updateChartFromInspector()" />
        </div>

        <div>
          <div class="config-label">X-Axis / Category</div>
          <select class="config-input">
            <option>Student Name (Col A)</option>
          </select>
        </div>

        <div>
          <div class="config-label">Active Series</div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" checked /> <span style="width: 10px; height: 10px; background: #3b82f6; border-radius: 2px;"></span> Physics (Marks)
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" checked /> <span style="width: 10px; height: 10px; background: #10b981; border-radius: 2px;"></span> Chemistry (Marks)
            </label>
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 11px; color: var(--text-tertiary);">
          ✓ Real-time 2-way data binding: Changing cell marks in LabSheets updates this chart instantly.
        </div>
      </div>

      <div class="inspector-body" id="inspector-customize-panel" style="display: none;">
        <div>
          <div class="config-label">Chart Title</div>
          <input class="config-input" id="inspector-chart-title" value="Physics vs Chemistry Marks" oninput="updateChartTitleFromInspector(this.value)" />
        </div>

        <div>
          <div class="config-label">Horizontal Axis Title</div>
          <input class="config-input" value="Student Candidates" />
        </div>

        <div>
          <div class="config-label">Vertical Axis Title</div>
          <input class="config-input" value="Marks Scored (out of 100)" />
        </div>

        <div>
          <div class="config-label">Legend Placement</div>
          <select class="config-input">
            <option>Bottom</option>
            <option>Top</option>
            <option>Right</option>
            <option>None</option>
          </select>
        </div>

        <div>
          <div class="config-label">Color Theme Palette</div>
          <select class="config-input" onchange="triggerToast('Applied ' + this.value + ' color palette')">
            <option>Ocean Blue & Emerald (Default)</option>
            <option>Sunset Warm (Amber & Rose)</option>
            <option>Classic Monochrome</option>
            <option>High Contrast</option>
          </select>
        </div>
      </div>
    </aside>
  </div>

  <!-- 4. BOTTOM STATUS BAR -->
  <footer class="app-status">
    <div style="display: flex; gap: 16px;">
      <span id="footer-selection-cell">Active Cell: B2</span>
      <span id="footer-metrics">Count: 6 | Sum: ₹ 5,450.00 | Average: ₹ 908.33 | Min: ₹ 85.00 | Max: ₹ 1,800.00</span>
    </div>
    <div style="display: flex; gap: 16px;">
      <span>100% Zoom</span>
      <span>English (India)</span>
      <span>Google Drive: 12.4 GB / 5,000 GB</span>
    </div>
  </footer>

  <!-- TOAST NOTIFICATION -->
  <div id="toast-popup" class="toast-box"></div>

  <!-- SCRIPT ENGINE -->
  <script>
    const state = {
      app: 'sheets', // 'sheets' | 'docs' | 'slides' | 'pdf' | 'media' | 'converter' | 'drive'
      theme: 'dark',
      activeCell: 'B2',
      chartType: 'column',
      sheets: {
        'Term 1 Marks': {
          'A1': { val: 'Student Name', bold: true },
          'B1': { val: 'Physics', bold: true },
          'C1': { val: 'Chemistry', bold: true },
          'D1': { val: 'Total', bold: true },
          'E1': { val: 'Fee Paid (₹)', bold: true },
          'A2': { val: 'Aarav Sharma' },
          'B2': { val: 85 },
          'C2': { val: 92 },
          'D2': { val: 177, formula: '=B2+C2' },
          'E2': { val: 45000, format: 'indian_currency' },
          'A3': { val: 'Diya Patel' },
          'B3': { val: 94 },
          'C3': { val: 88 },
          'D3': { val: 182, formula: '=B3+C3' },
          'E3': { val: 45000, format: 'indian_currency' },
          'A4': { val: 'Ishaan Verma' },
          'B4': { val: 78 },
          'C4': { val: 85 },
          'D4': { val: 163, formula: '=B4+C4' },
          'E4': { val: 55000, format: 'indian_currency' },
          'A5': { val: 'Class Average', bold: true },
          'B5': { val: 85.67, formula: '=AVERAGE(B2:B4)', bold: true },
          'C5': { val: 88.33, formula: '=AVERAGE(C2:C4)', bold: true },
          'D5': { val: 174.00, formula: '=AVERAGE(D2:D4)', bold: true }
        }
      }
    };

    // Initialize Grid
    function renderGrid() {
      const headerRow = document.getElementById('matrix-header-row');
      const tbody = document.getElementById('matrix-body');
      headerRow.innerHTML = '<th class="col-row-head">◢</th>';
      tbody.innerHTML = '';

      for (let c = 0; c < 15; c++) {
        const th = document.createElement('th');
        th.innerText = String.fromCharCode(65 + c);
        th.style.width = c === 0 ? '140px' : '100px';
        headerRow.appendChild(th);
      }

      const activeData = state.sheets['Term 1 Marks'] || {};
      for (let r = 1; r <= 25; r++) {
        const tr = document.createElement('tr');
        const rowHead = document.createElement('th');
        rowHead.className = 'col-row-head';
        rowHead.innerText = r;
        tr.appendChild(rowHead);

        for (let c = 0; c < 15; c++) {
          const colLetter = String.fromCharCode(65 + c);
          const cellKey = colLetter + r;
          const td = document.createElement('td');
          td.id = 'grid-cell-' + cellKey;

          const data = activeData[cellKey];
          if (data) {
            td.innerText = formatNumber(data.val, data.format);
            if (data.bold) td.style.fontWeight = 'bold';
          }

          td.onclick = () => selectCell(cellKey);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }

      selectCell(state.activeCell);
      drawSvgChart();
    }

    function formatNumber(val, format) {
      if (val === undefined || val === null || val === '') return '';
      if (typeof val !== 'number') return val;

      if (format === 'indian_currency') {
        return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
      if (format === 'indian_lakhs') {
        if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
        if (val >= 100000) return (val / 100000).toFixed(2) + ' Lakhs';
        return '₹ ' + val.toLocaleString('en-IN');
      }
      return val.toString();
    }

    function selectCell(cellKey) {
      document.querySelectorAll('.grid-table td').forEach(td => td.classList.remove('cell-active'));
      const td = document.getElementById('grid-cell-' + cellKey);
      if (td) td.classList.add('cell-active');

      state.activeCell = cellKey;
      document.getElementById('formula-cell-addr').innerText = cellKey;
      document.getElementById('footer-selection-cell').innerText = 'Active Cell: ' + cellKey;

      const data = state.sheets['Term 1 Marks']?.[cellKey];
      document.getElementById('formula-bar-input').value = data?.formula || (data?.val !== undefined ? data.val : '');
    }

    // Switch between Apps
    function switchApp(appName) {
      state.app = appName;
      document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-card').forEach(v => v.classList.remove('active'));

      const badge = document.getElementById('active-app-badge');
      const nameTag = document.getElementById('active-app-name');
      const exportLabel = document.getElementById('export-btn-label');
      const formulaRail = document.getElementById('sheets-formula-bar-rail');
      const numGroup = document.getElementById('ribbon-sheets-num-group');
      const chartBtn = document.getElementById('ribbon-chart-btn-group');
      const docsTpl = document.getElementById('ribbon-docs-tpl-group');
      const slidesGrp = document.getElementById('ribbon-slides-group');
      const slideMenu = document.getElementById('menu-slide-root');
      const dataMenu = document.getElementById('menu-data-root');

      if (appName === 'sheets') {
        document.querySelector('.rail-btn.sheets').classList.add('active');
        document.getElementById('view-sheets').classList.add('active');
        badge.className = 'suite-icon-badge badge-sheets';
        badge.innerText = 'S';
        nameTag.innerText = 'LabSheets';
        exportLabel.innerText = 'Export .xlsx';
        formulaRail.style.display = 'flex';
        numGroup.style.display = 'flex';
        chartBtn.style.display = 'flex';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'block';
        triggerToast('Switched to LabSheets');
      } else if (appName === 'docs') {
        document.querySelector('.rail-btn.docs').classList.add('active');
        document.getElementById('view-docs').classList.add('active');
        badge.className = 'suite-icon-badge badge-docs';
        badge.innerText = 'W';
        nameTag.innerText = 'LabDocs';
        exportLabel.innerText = 'Export .docx';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'flex';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Switched to LabDocs');
      } else if (appName === 'slides') {
        document.querySelector('.rail-btn.slides').classList.add('active');
        document.getElementById('view-slides').classList.add('active');
        badge.className = 'suite-icon-badge badge-slides';
        badge.innerText = 'P';
        nameTag.innerText = 'LabSlides (PPT)';
        exportLabel.innerText = 'Export .pptx';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'flex';
        slideMenu.style.display = 'block';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Switched to LabSlides (Presentations)');
      } else if (appName === 'pdf') {
        document.querySelector('.rail-btn.pdf').classList.add('active');
        document.getElementById('view-pdf').classList.add('active');
        badge.className = 'suite-icon-badge badge-pdf';
        badge.innerText = 'PDF';
        nameTag.innerText = 'LabPDF Studio';
        exportLabel.innerText = 'Export .pdf';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Switched to LabPDF Studio');
      } else if (appName === 'media') {
        document.querySelector('.rail-btn.media').classList.add('active');
        document.getElementById('view-media').classList.add('active');
        badge.className = 'suite-icon-badge badge-media';
        badge.innerText = 'M';
        nameTag.innerText = 'LOMS Media Studio';
        exportLabel.innerText = 'Render Media';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Switched to LOMS Media Studio');
      } else if (appName === 'converter') {
        document.querySelector('.rail-btn.converter').classList.add('active');
        document.getElementById('view-converter').classList.add('active');
        badge.className = 'suite-icon-badge badge-converter';
        badge.innerText = 'C';
        nameTag.innerText = 'Universal Converter';
        exportLabel.innerText = 'Batch Convert';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Switched to Universal Converter');
      } else if (appName === 'drive') {
        document.querySelector('.rail-btn.drive').classList.add('active');
        document.getElementById('view-drive').classList.add('active');
        badge.className = 'suite-icon-badge badge-drive';
        badge.innerText = '☁';
        nameTag.innerText = 'CloudVault';
        exportLabel.innerText = 'Download All';
        formulaRail.style.display = 'none';
        numGroup.style.display = 'none';
        chartBtn.style.display = 'none';
        docsTpl.style.display = 'none';
        slidesGrp.style.display = 'none';
        slideMenu.style.display = 'none';
        dataMenu.style.display = 'none';
        closeChartInspector();
        triggerToast('Connected to Google Drive (charan881130@gmail.com)');
      }
    }

    // Toggle Dropdown Menus
    function toggleMenu(menuId) {
      const menu = document.getElementById(menuId);
      const isOpen = menu.classList.contains('active');
      document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('active'));
      if (!isOpen) menu.classList.add('active');
    }

    // Click outside to close menus
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-btn')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('active'));
      }
    });

    // Chart Right Inspector controls
    function openChartInspector() {
      document.getElementById('chart-right-inspector').classList.add('open');
    }

    function closeChartInspector() {
      document.getElementById('chart-right-inspector').classList.remove('open');
    }

    function setInspectorTab(tab) {
      document.querySelectorAll('.inspector-tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-btn-' + tab).classList.add('active');

      if (tab === 'setup') {
        document.getElementById('inspector-setup-panel').style.display = 'flex';
        document.getElementById('inspector-customize-panel').style.display = 'none';
      } else {
        document.getElementById('inspector-setup-panel').style.display = 'none';
        document.getElementById('inspector-customize-panel').style.display = 'flex';
      }
    }

    function updateChartFromInspector() {
      state.chartType = document.getElementById('inspector-chart-type').value;
      drawSvgChart();
      triggerToast('Chart updated: ' + state.chartType);
    }

    function updateChartTitleFromInspector(title) {
      document.getElementById('chart-display-title').innerText = title;
    }

    // Draw SVG Chart
    function drawSvgChart() {
      const container = document.getElementById('svg-chart-container');
      const w = 400;
      const h = 210;

      const aaravP = state.sheets['Term 1 Marks']['B2'].val;
      const aaravC = state.sheets['Term 1 Marks']['C2'].val;
      const diyaP = state.sheets['Term 1 Marks']['B3'].val;
      const diyaC = state.sheets['Term 1 Marks']['C3'].val;
      const ishaanP = state.sheets['Term 1 Marks']['B4'].val;
      const ishaanC = state.sheets['Term 1 Marks']['C4'].val;

      let svg = '<svg width="100%" height="100%" viewBox="0 0 ' + w + ' ' + h + '">';
      
      // Gridlines
      for (let y = 30; y <= 160; y += 32) {
        svg += '<line x1="40" y1="' + y + '" x2="380" y2="' + y + '" stroke="#374151" stroke-dasharray="3" />';
      }

      if (state.chartType === 'line' || state.chartType === 'spline') {
        const p1 = '80,' + (170 - aaravP * 1.3);
        const p2 = '200,' + (170 - diyaP * 1.3);
        const p3 = '320,' + (170 - ishaanP * 1.3);
        const c1 = '80,' + (170 - aaravC * 1.3);
        const c2 = '200,' + (170 - diyaC * 1.3);
        const c3 = '320,' + (170 - ishaanC * 1.3);

        svg += '<polyline points="' + p1 + ' ' + p2 + ' ' + p3 + '" fill="none" stroke="#3b82f6" stroke-width="3" />';
        svg += '<polyline points="' + c1 + ' ' + c2 + ' ' + c3 + '" fill="none" stroke="#10b981" stroke-width="3" />';
        svg += '<circle cx="80" cy="' + (170 - aaravP * 1.3) + '" r="5" fill="#3b82f6" />';
        svg += '<circle cx="200" cy="' + (170 - diyaP * 1.3) + '" r="5" fill="#3b82f6" />';
        svg += '<circle cx="320" cy="' + (170 - ishaanP * 1.3) + '" r="5" fill="#3b82f6" />';
      } else {
        // Clustered Column
        svg += '<rect x="65" y="' + (170 - aaravP * 1.3) + '" width="24" height="' + (aaravP * 1.3) + '" fill="#3b82f6" rx="3" />';
        svg += '<rect x="95" y="' + (170 - aaravC * 1.3) + '" width="24" height="' + (aaravC * 1.3) + '" fill="#10b981" rx="3" />';
        svg += '<rect x="185" y="' + (170 - diyaP * 1.3) + '" width="24" height="' + (diyaP * 1.3) + '" fill="#3b82f6" rx="3" />';
        svg += '<rect x="215" y="' + (170 - diyaC * 1.3) + '" width="24" height="' + (diyaC * 1.3) + '" fill="#10b981" rx="3" />';
        svg += '<rect x="305" y="' + (170 - ishaanP * 1.3) + '" width="24" height="' + (ishaanP * 1.3) + '" fill="#3b82f6" rx="3" />';
        svg += '<rect x="335" y="' + (170 - ishaanC * 1.3) + '" width="24" height="' + (ishaanC * 1.3) + '" fill="#10b981" rx="3" />';
      }

      // X-Axis Labels
      svg += '<text x="92" y="190" fill="#9ca3af" font-size="11" text-anchor="middle">Aarav</text>';
      svg += '<text x="212" y="190" fill="#9ca3af" font-size="11" text-anchor="middle">Diya</text>';
      svg += '<text x="332" y="190" fill="#9ca3af" font-size="11" text-anchor="middle">Ishaan</text>';

      svg += '</svg>';
      container.innerHTML = svg;
    }

    // PDF Card Rotation & Manipulation
    const pdfRotations = { 1: 0, 2: 0, 3: 0, 4: 0 };
    function rotatePdfCard(id, angle) {
      pdfRotations[id] = ((pdfRotations[id] || 0) + angle) % 360;
      const thumb = document.getElementById('pdf-thumb-' + id);
      if (thumb) {
        thumb.style.transform = 'rotate(' + pdfRotations[id] + 'deg)';
      }
      triggerToast('Rotated Page ' + id + ' to ' + pdfRotations[id] + '°');
    }

    function deletePdfCard(id) {
      const card = document.getElementById('pdf-card-' + id);
      if (card) {
        card.style.display = 'none';
        triggerToast('Removed Page ' + id + ' from PDF sequence');
      }
    }

    function updatePdfWatermark(text) {
      for (let i = 1; i <= 4; i++) {
        const wm = document.getElementById('wm-' + i);
        if (wm) {
          wm.innerText = text ? text.toUpperCase() : '';
        }
      }
    }

    function togglePdfPageNums(show) {
      document.querySelectorAll('.pg-num-lbl').forEach(el => {
        el.style.display = show ? 'block' : 'none';
      });
      triggerToast(show ? 'Page numbering enabled' : 'Page numbering hidden');
    }

    // Slide management
    function selectSlide(num) {
      document.querySelectorAll('.slide-thumb-card').forEach(s => s.classList.remove('active'));
      const cards = document.querySelectorAll('.slide-thumb-card');
      if (cards[num - 1]) cards[num - 1].classList.add('active');

      const headings = [
        'Electromagnetic Induction & Faraday\\'s Laws',
        'Objectives & Experimental Scope',
        'Apparatus & Circuit Architecture',
        'Key Findings & Deflection Correlations'
      ];
      document.getElementById('slide-heading-text').innerText = headings[num - 1] || 'Slide ' + num;
      triggerToast('Switched to Slide ' + num);
    }

    function addNewSlide() {
      triggerToast('Created new Slide 5 (Title and Content layout)');
    }

    function duplicateCurrentSlide() {
      triggerToast('Duplicated current slide');
    }

    function deleteCurrentSlide() {
      triggerToast('Deleted active slide');
    }

    function startSlideShow() {
      triggerToast('Starting Fullscreen Slideshow Mode (Press Esc to exit)...');
    }

    // Google Drive Asset Loader
    function openDriveAsset(app) {
      switchApp(app);
      triggerToast('Opened asset from Google Drive!');
    }

    // Theme toggling
    function cycleAppTheme() {
      const body = document.body;
      const label = document.getElementById('theme-btn-label');
      if (state.theme === 'dark') {
        state.theme = 'light';
        body.setAttribute('data-theme', 'light');
        label.innerText = '☀️ Light Mode';
        triggerToast('Switched to Light Theme');
      } else if (state.theme === 'light') {
        state.theme = 'contrast';
        body.setAttribute('data-theme', 'contrast');
        label.innerText = '⚡ High Contrast';
        triggerToast('Switched to High Contrast Theme');
      } else {
        state.theme = 'dark';
        body.setAttribute('data-theme', 'dark');
        label.innerText = '🌙 Dark Mode';
        triggerToast('Switched to Dark Theme');
      }
    }

    function triggerToast(text) {
      const box = document.getElementById('toast-popup');
      box.innerText = '⚡ ' + text;
      box.style.display = 'flex';
      setTimeout(() => { box.style.display = 'none'; }, 2200);
    }

    function toggleFormat(fmt) {
      triggerToast('Toggled ' + fmt);
    }

    function applyFormat(fmt) {
      triggerToast('Applied format: ' + fmt);
    }

    function exportCurrentDoc() {
      triggerToast('Downloading exported file...');
    }

    function promptMathFormula() {
      const formula = prompt('Enter LaTeX Formula (KaTeX syntax):', 'E = mc^2 \\\\quad \\\\text{or} \\\\quad \\\\oint B \\\\cdot dl = \\\\mu_0 I');
      if (formula) triggerToast('Inserted KaTeX Formula');
    }

    function instantiateTemplatePrompt() {
      triggerToast('Instantiated CBSE Question Paper Template with {{placeholders}}');
    }

    window.addEventListener('DOMContentLoaded', () => {
      renderGrid();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(targetPath, html, 'utf8');
console.log('Successfully wrote redesigned office-suite-preview.html');
