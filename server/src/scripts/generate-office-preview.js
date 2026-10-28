const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/public/office-suite-preview.html');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>In-House Office Suite — Interactive UI/UX Preview (Sheets & Docs)</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --bg-canvas: #ffffff;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #334155;
      --accent-blue: #3b82f6;
      --accent-emerald: #10b981;
      --accent-purple: #8b5cf6;
      --accent-amber: #f59e0b;
      --cell-border: #e2e8f0;
      --cell-selected: #e0f2fe;
      --cell-selected-border: #0284c7;
      --canvas-text: #0f172a;
    }

    [data-theme="light"] {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --bg-canvas: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #cbd5e1;
      --cell-border: #cbd5e1;
      --cell-selected: #dbeafe;
      --cell-selected-border: #2563eb;
      --canvas-text: #0f172a;
    }

    [data-theme="high-contrast"] {
      --bg-primary: #000000;
      --bg-secondary: #111111;
      --bg-tertiary: #222222;
      --bg-canvas: #ffffff;
      --text-main: #ffffff;
      --text-muted: #ffff00;
      --border-color: #ffffff;
      --accent-blue: #00ffff;
      --accent-emerald: #00ff00;
      --cell-border: #000000;
      --cell-selected: #ffff99;
      --cell-selected-border: #000000;
      --canvas-text: #000000;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* Top Command Header */
    header {
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 50;
    }

    .top-meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .app-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .app-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
    }
    .app-icon.sheets { background: linear-gradient(135deg, #10b981, #059669); }
    .app-icon.docs { background: linear-gradient(135deg, #3b82f6, #2563eb); }

    .doc-title-input {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-main);
      font-size: 15px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      outline: none;
      transition: all 0.15s;
    }
    .doc-title-input:hover, .doc-title-input:focus {
      background: var(--bg-tertiary);
      border-color: var(--border-color);
    }

    .suite-nav-pills {
      display: flex;
      background: var(--bg-tertiary);
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }

    .nav-pill {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .nav-pill.active {
      background: var(--bg-secondary);
      color: var(--text-main);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .nav-pill:hover:not(.active) {
      color: var(--text-main);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--accent-emerald);
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 9px;
      border-radius: 20px;
      font-weight: 600;
    }

    .gdrive-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 9px;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
    }
    .gdrive-badge:hover {
      background: rgba(56, 189, 248, 0.2);
    }

    .btn {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn:hover {
      background: var(--border-color);
    }
    .btn-primary {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .btn-emerald {
      background: var(--accent-emerald);
      border-color: var(--accent-emerald);
      color: white;
    }
    .btn-emerald:hover {
      background: #059669;
    }

    /* Menu Bar */
    .menu-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 12px;
    }
    .menu-item {
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-muted);
      position: relative;
    }
    .menu-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-main);
    }

    /* Formatting Ribbon */
    .toolbar-ribbon {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
      font-size: 12px;
    }
    .tool-group {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 0 4px;
      border-right: 1px solid var(--border-color);
    }
    .tool-group:last-child {
      border-right: none;
    }

    .tool-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-main);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.1s;
    }
    .tool-btn:hover {
      background: var(--bg-tertiary);
      border-color: var(--border-color);
    }
    .tool-btn.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--accent-blue);
      color: var(--accent-blue);
    }

    .tool-select {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      height: 28px;
    }

    /* Formula Bar (Sheets) */
    .formula-bar-container {
      display: flex;
      align-items: center;
      padding: 4px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      gap: 8px;
      font-size: 12px;
    }
    .name-box {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      width: 70px;
      text-align: center;
      font-family: monospace;
    }
    .fx-symbol {
      color: var(--text-muted);
      font-weight: bold;
      font-style: italic;
      user-select: none;
    }
    .formula-input {
      flex: 1;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
      font-family: "JetBrains Mono", Consolas, monospace;
      outline: none;
    }
    .formula-input:focus {
      border-color: var(--accent-blue);
    }

    /* App Views Container */
    .main-workspace {
      flex: 1;
      overflow: hidden;
      display: flex;
      position: relative;
    }

    .view-container {
      flex: 1;
      height: 100%;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .view-container.active {
      display: flex;
    }

    /* In-House Sheets Grid */
    .grid-wrapper {
      flex: 1;
      overflow: auto;
      position: relative;
      background: var(--bg-primary);
    }

    .spreadsheet-table {
      border-collapse: collapse;
      table-layout: fixed;
      background: var(--bg-canvas);
      color: var(--canvas-text);
      font-size: 12px;
      user-select: none;
    }

    .spreadsheet-table th, .spreadsheet-table td {
      border: 1px solid var(--cell-border);
      padding: 4px 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      height: 26px;
    }

    .spreadsheet-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .spreadsheet-table th.row-header {
      width: 46px;
      left: 0;
      z-index: 15;
    }
    .spreadsheet-table th.corner-header {
      top: 0;
      left: 0;
      z-index: 25;
      background: #e2e8f0;
      cursor: pointer;
    }

    .spreadsheet-table td {
      cursor: cell;
      position: relative;
    }
    .spreadsheet-table td.selected {
      background-color: var(--cell-selected) !important;
      outline: 2px solid var(--cell-selected-border);
      outline-offset: -2px;
      z-index: 5;
    }
    .spreadsheet-table td.in-range {
      background-color: var(--cell-selected) !important;
    }

    /* Sheet Tabs Bar */
    .sheet-tabs-bar {
      display: flex;
      align-items: center;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      padding: 4px 16px;
      gap: 6px;
      flex-shrink: 0;
    }
    .sheet-tab {
      padding: 6px 14px;
      border-radius: 6px 6px 0 0;
      background: var(--bg-tertiary);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border-color);
      border-bottom: none;
    }
    .sheet-tab.active {
      background: var(--bg-primary);
      color: var(--text-main);
      border-top: 2px solid var(--accent-emerald);
    }
    .add-tab-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      cursor: pointer;
      font-size: 16px;
    }

    /* Floating Chart Container (Sheets) */
    .floating-chart-box {
      position: absolute;
      top: 60px;
      right: 40px;
      width: 480px;
      height: 320px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 30;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      resize: both;
    }
    .chart-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
      font-size: 12px;
      font-weight: 700;
    }
    .chart-box-body {
      flex: 1;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
    }

    /* In-House Docs Canvas */
    .docs-workspace-wrapper {
      flex: 1;
      overflow: auto;
      background: #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 20px 80px;
    }
    [data-theme="dark"] .docs-workspace-wrapper {
      background: #090d16;
    }

    /* Top Ruler */
    .ruler-bar {
      width: 816px;
      height: 22px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-bottom: none;
      display: flex;
      align-items: flex-end;
      padding: 0 40px;
      font-size: 9px;
      color: #64748b;
      font-family: monospace;
      user-select: none;
    }
    [data-theme="dark"] .ruler-bar {
      background: #1e293b;
      border-color: #334155;
      color: #94a3b8;
    }

    /* A4 Paginated Page */
    .a4-page {
      width: 816px;
      min-height: 1056px;
      background: white;
      color: #0f172a;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #cbd5e1;
      padding: 72px 72px; /* 1 inch margin */
      position: relative;
      margin-bottom: 24px;
      outline: none;
    }
    .a4-page:focus {
      border-color: var(--accent-blue);
    }

    .page-header-area {
      position: absolute;
      top: 24px;
      left: 72px;
      right: 72px;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #64748b;
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .page-footer-area {
      position: absolute;
      bottom: 24px;
      left: 72px;
      right: 72px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #64748b;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
    }

    /* Document Typography */
    .a4-page h1 { font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #0f172a; }
    .a4-page h2 { font-size: 18px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .a4-page h3 { font-size: 14px; font-weight: 700; margin-top: 12px; margin-bottom: 6px; color: #334155; }
    .a4-page p { font-size: 13px; line-height: 1.6; margin-bottom: 10px; color: #334155; }
    
    .math-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      border-radius: 6px;
      padding: 10px 16px;
      margin: 12px 0;
      font-family: "Cambria Math", "Times New Roman", serif;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 12px;
    }
    .doc-table th, .doc-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .doc-table th {
      background: #f1f5f9;
      font-weight: 700;
    }

    /* Status Bar */
    footer.app-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    /* Google Drive Explorer Drawer / Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.active {
      display: flex;
    }

    .modal-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      width: 720px;
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .drive-file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      margin-bottom: 8px;
      background: var(--bg-tertiary);
      transition: all 0.15s;
    }
    .drive-file-item:hover {
      border-color: var(--accent-blue);
      transform: translateY(-1px);
    }
    .drive-file-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Notification toast */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 200;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body data-theme="dark">

  <!-- TOP COMMAND BAR -->
  <header>
    <div class="top-meta-bar">
      <div class="app-brand">
        <div id="app-badge-icon" class="app-icon sheets">S</div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input id="doc-title" class="doc-title-input" value="Term 1 Science Gradebook & Budget (2026)" />
            <span id="gdrive-connected-pill" class="gdrive-badge" onclick="openDriveModal()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
              <span>charan881130@gmail.com (5TB Drive)</span>
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            <span id="save-indicator" class="status-pill">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Saved to PostgreSQL</span>
            </span>
            <span>Version: v2.4 (Checkpoint)</span>
          </div>
        </div>
      </div>

      <!-- Application Switcher -->
      <div class="suite-nav-pills">
        <button class="nav-pill active" onclick="switchAppMode('sheets')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
          In-House Sheets
        </button>
        <button class="nav-pill" onclick="switchAppMode('docs')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          In-House Docs
        </button>
        <button class="nav-pill" onclick="openDriveModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
          Google Drive Files
        </button>
      </div>

      <!-- Quick Action Controls -->
      <div class="header-actions">
        <button class="btn" onclick="toggleTheme()" title="Switch Light/Dark/High-Contrast">
          <span id="theme-btn-label">☀️ Light</span>
        </button>
        <button class="btn btn-primary" onclick="exportActiveFile('xlsx')" id="export-primary-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <span>Export .xlsx</span>
        </button>
        <button class="btn btn-emerald" onclick="openDriveModal()">
          <span>Open Drive File</span>
        </button>
      </div>
    </div>

    <!-- Application Menus (File, Edit, View, Insert, Format, Data, Tools) -->
    <div class="menu-bar">
      <div class="menu-item">File</div>
      <div class="menu-item">Edit</div>
      <div class="menu-item">View</div>
      <div class="menu-item" onclick="triggerInsertAction()">Insert</div>
      <div class="menu-item">Format</div>
      <div class="menu-item" id="menu-data-tab">Data</div>
      <div class="menu-item">Tools</div>
      <div class="menu-item" onclick="showHelpModal()">Help</div>
    </div>

    <!-- Main Formatting Ribbon -->
    <div class="toolbar-ribbon">
      <!-- Undo / Redo -->
      <div class="tool-group">
        <button class="tool-btn" onclick="triggerToast('Undo performed')" title="Undo (Cmd/Ctrl+Z)">↶</button>
        <button class="tool-btn" onclick="triggerToast('Redo performed')" title="Redo (Cmd/Ctrl+Y)">↷</button>
      </div>

      <!-- Fonts & Sizes -->
      <div class="tool-group">
        <select class="tool-select" id="font-family-select" onchange="applyFontStyle('fontFamily', this.value)">
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="'Times New Roman'">Times New Roman</option>
          <option value="Roboto">Roboto</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select class="tool-select" id="font-size-select" style="width: 58px;" onchange="applyFontStyle('fontSize', this.value)">
          <option value="10">10</option>
          <option value="11" selected>11</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="24">24</option>
        </select>
      </div>

      <!-- Basic Text Styling -->
      <div class="tool-group">
        <button class="tool-btn" onclick="toggleStyle('bold')" title="Bold (Cmd/Ctrl+B)"><b>B</b></button>
        <button class="tool-btn" onclick="toggleStyle('italic')" title="Italic (Cmd/Ctrl+I)"><i>I</i></button>
        <button class="tool-btn" onclick="toggleStyle('underline')" title="Underline (Cmd/Ctrl+U)"><u>U</u></button>
        <button class="tool-btn" onclick="toggleStyle('strike')" title="Strikethrough"><s>S</s></button>
      </div>

      <!-- Colors -->
      <div class="tool-group">
        <button class="tool-btn" onclick="cycleTextColor()" title="Text Color" style="color: #ef4444;">A</button>
        <button class="tool-btn" onclick="cycleCellBg()" title="Cell Fill Color">🪣</button>
        <button class="tool-btn" onclick="applyBorder('all')" title="All Borders" id="btn-borders">⊞</button>
      </div>

      <!-- Alignment & Merging -->
      <div class="tool-group">
        <button class="tool-btn" onclick="setAlignment('left')" title="Align Left">⇤</button>
        <button class="tool-btn" onclick="setAlignment('center')" title="Align Center">⇔</button>
        <button class="tool-btn" onclick="setAlignment('right')" title="Align Right">⇥</button>
        <button class="tool-btn" onclick="toggleMergeCells()" title="Merge Cells (With data loss warning)">⛶</button>
      </div>

      <!-- Number Formatting with Indian Rupee & Lakh/Crore -->
      <div class="tool-group" id="sheets-number-formatting-tools">
        <select class="tool-select" id="number-format-select" onchange="applyNumberFormat(this.value)">
          <option value="general">General (Auto)</option>
          <option value="number">Number (1,234.50)</option>
          <option value="indian_currency" selected>₹ Indian Rupee (₹ 12,34,567.50)</option>
          <option value="indian_lakhs">Lakhs / Crores (12.34 Lakhs)</option>
          <option value="usd">$ US Dollar ($ 1,234.50)</option>
          <option value="percent">Percent (85.0%)</option>
          <option value="scientific">Scientific (1.23E+06)</option>
          <option value="date">Date (DD/MM/YYYY)</option>
        </select>
        <button class="tool-btn" onclick="adjustDecimals(1)" title="Increase Decimals">.00→</button>
        <button class="tool-btn" onclick="adjustDecimals(-1)" title="Decrease Decimals">←.0</button>
      </div>

      <!-- High-Value Actions (Chart Wizard, LaTeX, Templates) -->
      <div class="tool-group">
        <button class="btn btn-primary" onclick="openChartWizard()" id="toolbar-chart-btn">
          📊 11+ Chart Families
        </button>
        <button class="btn" onclick="openTemplateModal()" id="toolbar-template-btn" style="display: none;">
          📄 Instructor Templates
        </button>
        <button class="btn" onclick="insertMathEquation()" id="toolbar-math-btn" style="display: none;">
          ∑ KaTeX Formula
        </button>
      </div>
    </div>

    <!-- Formula Bar (For Sheets) -->
    <div id="sheets-formula-bar" class="formula-bar-container">
      <div id="cell-name-box" class="name-box">B2</div>
      <span class="fx-symbol">fx</span>
      <input id="formula-input-field" class="formula-input" value="85" placeholder="Enter formula (e.g. =SUM(B2:B5), =AVERAGE(C2:C5), =IF(B2>=40,'Pass','Fail'))" />
    </div>
  </header>

  <!-- MAIN WORKSPACE -->
  <main class="main-workspace">

    <!-- 1. IN-HOUSE SHEETS VIEW -->
    <div id="sheets-view" class="view-container active">
      <div class="grid-wrapper">
        <table id="spreadsheet-grid" class="spreadsheet-table">
          <thead>
            <tr id="grid-header-row">
              <th class="corner-header" onclick="selectAllCells()">◢</th>
              <!-- A to Z generated dynamically -->
            </tr>
          </thead>
          <tbody id="grid-body">
            <!-- Rows 1 to 35 generated dynamically -->
          </tbody>
        </table>

        <!-- Floating Dynamic Chart Widget -->
        <div id="floating-chart-widget" class="floating-chart-box">
          <div class="chart-box-header">
            <span id="chart-widget-title">Physics vs Chemistry Marks (Clustered Column)</span>
            <div style="display: flex; gap: 6px;">
              <button class="tool-btn" onclick="cycleChartType()" title="Cycle Chart Type">🔄</button>
              <button class="tool-btn" onclick="toggleChartWidget()" title="Close Chart">✕</button>
            </div>
          </div>
          <div class="chart-box-body" id="chart-render-canvas">
            <!-- Dynamic SVG Chart rendered here -->
          </div>
        </div>
      </div>

      <!-- Sheet Tabs Bar -->
      <div class="sheet-tabs-bar">
        <div class="sheet-tab active" onclick="switchSheetTab('Class 10 Marks')">Class 10 Marks</div>
        <div class="sheet-tab" onclick="switchSheetTab('Lab Budget')">Lab Budget</div>
        <div class="sheet-tab" onclick="switchSheetTab('Experiment Observations')">Experiment Observations</div>
        <button class="add-tab-btn" onclick="addNewSheetTab()" title="Add Sheet Tab">+</button>
      </div>
    </div>

    <!-- 2. IN-HOUSE DOCS VIEW -->
    <div id="docs-view" class="view-container">
      <div class="docs-workspace-wrapper">
        <!-- Top Horizontal Margin Ruler -->
        <div class="ruler-bar">
          <span>| 1"</span>
          <span style="margin-left: 140px;">| 2"</span>
          <span style="margin-left: 140px;">| 3"</span>
          <span style="margin-left: 140px;">| 4"</span>
          <span style="margin-left: 140px;">| 5"</span>
          <span style="margin-left: 140px;">| 6"</span>
        </div>

        <!-- A4 Page 1 -->
        <div class="a4-page" contenteditable="true" id="docs-page-canvas">
          <div class="page-header-area">
            <span>DELHI PUBLIC SCHOOL — ACADEMIC SESSION 2026-27</span>
            <span>CLASS XII PHYSICS PRACTICAL RECORD</span>
          </div>

          <h1>Verification of Ohm's Law & Internal Resistance</h1>
          <p><strong>Department of Sciences & Technology</strong> | Instructor: <em>Dr. Vikram Sen</em></p>

          <h2>1. Aim & Objective</h2>
          <p>To determine the resistance per unit length of a given wire by plotting a graph of potential difference versus current, and to compute the resistivity of the specimen material under standard laboratory conditions.</p>

          <h2>2. Governing Mathematical Equations (KaTeX)</h2>
          <div class="math-card">
            I = \frac{V}{R} \quad \implies \quad R = \rho \frac{L}{A} = \frac{\rho L}{\pi r^2}
          </div>
          <p>Where <em>V</em> represents potential difference in Volts, <em>I</em> is current in Amperes, <em>R</em> is resistance in Ohms, <em>\rho</em> is specific resistivity, and <em>r</em> is the wire radius.</p>

          <h2>3. Observation Table (Dynamic Grid)</h2>
          <table class="doc-table">
            <thead>
              <tr>
                <th>Trial #</th>
                <th>Voltmeter Reading V (Volts)</th>
                <th>Ammeter Reading I (Amperes)</th>
                <th>Resistance R = V/I (Ω)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>1.20 V</td>
                <td>0.24 A</td>
                <td>5.00 Ω</td>
              </tr>
              <tr>
                <td>2</td>
                <td>2.40 V</td>
                <td>0.48 A</td>
                <td>5.00 Ω</td>
              </tr>
              <tr>
                <td>3</td>
                <td>3.60 V</td>
                <td>0.71 A</td>
                <td>5.07 Ω</td>
              </tr>
            </tbody>
          </table>

          <h2>4. Result & Error Analysis</h2>
          <p>The graph between <em>V</em> and <em>I</em> is found to be a straight line passing through the origin, which validates Ohm's Law with an experimental deviation of less than 1.4%.</p>

          <div class="page-footer-area">
            <span>CONFIDENTIAL — FOR INTERNAL USE ONLY</span>
            <span>Page 1 of 2</span>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- APPLICATION STATUS FOOTER -->
  <footer class="app-status-bar">
    <div class="status-left">
      <span id="status-selection-info">Selection: B2:D4</span>
      <span id="status-metrics">Count: 6 | Sum: ₹ 5,450.00 | Average: ₹ 908.33 | Min: ₹ 85.00 | Max: ₹ 1,800.00</span>
    </div>
    <div class="status-right">
      <span>100% Zoom</span>
      <span>UTF-8 / English (India)</span>
      <span>Storage Quota: 12.4 GB / 5.0 TB Google Cloud</span>
    </div>
  </footer>

  <!-- GOOGLE DRIVE FILES MODAL -->
  <div id="gdrive-modal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #0284c7; display: flex; align-items: center; justify-content: center; color: white;">☁️</div>
          <div>
            <h3 style="font-size: 15px; font-weight: 700;">Google Drive File Browser</h3>
            <p style="font-size: 11px; color: var(--text-muted);">Account: charan881130@gmail.com (Connected • 5TB Enterprise Quota)</p>
          </div>
        </div>
        <button class="tool-btn" onclick="closeDriveModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Select any Google Drive document or spreadsheet to open directly inside your In-House Office Suite:
        </p>

        <!-- Drive Files List -->
        <div class="drive-file-item">
          <div class="drive-file-meta">
            <span style="font-size: 20px;">📊</span>
            <div>
              <strong style="font-size: 13px;">Class 10 CBSE Final Term Marks & Gradebook.gsheet</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Google Sheets • Modified 2 hours ago by Charanpreet Singh</div>
            </div>
          </div>
          <button class="btn btn-emerald" onclick="openDriveSample('marks_sheet')">
            Open in Sheets
          </button>
        </div>

        <div class="drive-file-item">
          <div class="drive-file-meta">
            <span style="font-size: 20px;">📄</span>
            <div>
              <strong style="font-size: 13px;">CBSE Class 12 Physics Mid-Term Examination 2026.gdoc</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Google Docs • 3 Pages • Modified Yesterday</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="openDriveSample('physics_exam')">
            Open in Docs
          </button>
        </div>

        <div class="drive-file-item">
          <div class="drive-file-meta">
            <span style="font-size: 20px;">📊</span>
            <div>
              <strong style="font-size: 13px;">Annual Science Lab Budget & Equipment Order 2026-27.xlsx</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Microsoft Excel • ₹ 14.5 Lakhs Total • 4 Worksheets</div>
            </div>
          </div>
          <button class="btn btn-emerald" onclick="openDriveSample('lab_budget')">
            Open in Sheets
          </button>
        </div>

        <div class="drive-file-item">
          <div class="drive-file-meta">
            <span style="font-size: 20px;">📄</span>
            <div>
              <strong style="font-size: 13px;">Official Circular - National Science Exhibition Guidelines.gdoc</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Google Docs • Signed by Principal • With {{placeholders}}</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="openDriveSample('circular')">
            Open in Docs
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeDriveModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- CHART WIZARD MODAL (11+ Chart Families) -->
  <div id="chart-wizard-modal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3 style="font-size: 15px; font-weight: 700;">📊 In-House Chart Creation Wizard (11+ Families)</h3>
        <button class="tool-btn" onclick="closeChartWizard()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
          Choose from 11 educational chart families. Charts automatically bind to cell range <strong id="wizard-range-label">A1:C4</strong> and update dynamically when cell values change.
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('column')">
            <span style="font-size: 20px;">📊</span>
            <span>Clustered Column</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('stacked_column')">
            <span style="font-size: 20px;">📶</span>
            <span>Stacked Column</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('bar')">
            <span style="font-size: 20px;">📉</span>
            <span>Clustered Bar</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('line')">
            <span style="font-size: 20px;">📈</span>
            <span>Line with Markers</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('spline')">
            <span style="font-size: 20px;">〰️</span>
            <span>Smooth Spline</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('area')">
            <span style="font-size: 20px;">⛰️</span>
            <span>Area Chart</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('pie')">
            <span style="font-size: 20px;">🥧</span>
            <span>Pie Chart</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('doughnut')">
            <span style="font-size: 20px;">🍩</span>
            <span>Doughnut Chart</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('scatter')">
            <span style="font-size: 20px;">⁖</span>
            <span>XY Scatter & Trend</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: center; flex-direction: column;" onclick="selectChartFamily('radar')">
            <span style="font-size: 20px;">🕸️</span>
            <span>Radar / Spider Matrix</span>
          </div>
          <div class="btn" style="height: 60px; justify-content: column;" onclick="selectChartFamily('combo')">
            <span style="font-size: 20px;">📊📈</span>
            <span>Combo (Column + Line)</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeChartWizard()">Cancel</button>
      </div>
    </div>
  </div>

  <!-- TEMPLATE MODAL (DOCS) -->
  <div id="template-modal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3 style="font-size: 15px; font-weight: 700;">📄 Academic & Instructor Templates Engine</h3>
        <button class="tool-btn" onclick="closeTemplateModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          Generate structured institutional documents with automated placeholder replacement (e.g. <code>{{school_name}}</code>, <code>{{exam_title}}</code>):
        </p>

        <div class="drive-file-item" onclick="loadInstructorTemplate('exam')">
          <div class="drive-file-meta">
            <span style="font-size: 22px;">📝</span>
            <div>
              <strong>Annual Question Paper Template (CBSE Standard)</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Includes school header, time 3 Hours, max marks 70, section divisions & marking scheme</div>
            </div>
          </div>
          <button class="btn btn-primary">Instantiate Template</button>
        </div>

        <div class="drive-file-item" onclick="loadInstructorTemplate('lesson_plan')">
          <div class="drive-file-meta">
            <span style="font-size: 22px;">📋</span>
            <div>
              <strong>Comprehensive Lesson Plan (NCERT / NEP 2020)</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Pedagogical objectives, lab apparatus checklist, evaluation rubrics & homework</div>
            </div>
          </div>
          <button class="btn btn-primary">Instantiate Template</button>
        </div>

        <div class="drive-file-item" onclick="loadInstructorTemplate('circular')">
          <div class="drive-file-meta">
            <span style="font-size: 22px;">📜</span>
            <div>
              <strong>Official School Circular / Notice Template</strong>
              <div style="font-size: 11px; color: var(--text-muted);">Reference number, date, subject line, recipient groups, principal seal block</div>
            </div>
          </div>
          <button class="btn btn-primary">Instantiate Template</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeTemplateModal()">Cancel</button>
      </div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div id="toast-shelf" class="toast-container"></div>

  <!-- JAVASCRIPT ENGINE -->
  <script>
    // State management
    const appState = {
      mode: 'sheets', // 'sheets' | 'docs'
      theme: 'dark',  // 'dark' | 'light' | 'high-contrast'
      activeCell: 'B2',
      selectedRange: ['B2', 'B3', 'B4'],
      activeSheet: 'Class 10 Marks',
      chartType: 'column',
      sheetsData: {
        'Class 10 Marks': {
          'A1': { val: 'Student Name', bold: true, bg: '#f1f5f9' },
          'B1': { val: 'Physics (Marks)', bold: true, bg: '#f1f5f9' },
          'C1': { val: 'Chemistry (Marks)', bold: true, bg: '#f1f5f9' },
          'D1': { val: 'Total Marks', bold: true, bg: '#f1f5f9' },
          'E1': { val: 'Fee Paid (₹)', bold: true, bg: '#f1f5f9' },
          'A2': { val: 'Aarav Sharma' },
          'B2': { val: 85 },
          'C2': { val: 92 },
          'D2': { val: 177, formula: '=B2+C2' },
          'E2': { val: 45000, numFormat: 'indian_currency' },
          'A3': { val: 'Diya Patel' },
          'B3': { val: 94 },
          'C3': { val: 88 },
          'D3': { val: 182, formula: '=B3+C3' },
          'E3': { val: 45000, numFormat: 'indian_currency' },
          'A4': { val: 'Ishaan Verma' },
          'B4': { val: 78 },
          'C4': { val: 85 },
          'D4': { val: 163, formula: '=B4+C4' },
          'E4': { val: 55000, numFormat: 'indian_currency' },
          'A5': { val: 'Class Average', bold: true },
          'B5': { val: 85.67, formula: '=AVERAGE(B2:B4)', bold: true, bg: '#e0f2fe' },
          'C5': { val: 88.33, formula: '=AVERAGE(C2:C4)', bold: true, bg: '#e0f2fe' },
          'D5': { val: 174.00, formula: '=AVERAGE(D2:D4)', bold: true, bg: '#e0f2fe' },
          'E5': { val: 145000, formula: '=SUM(E2:E4)', bold: true, bg: '#e0f2fe', numFormat: 'indian_currency' }
        }
      }
    };

    // Initialize Grid Table
    function initGrid() {
      const headerRow = document.getElementById('grid-header-row');
      const tbody = document.getElementById('grid-body');

      // Clear
      headerRow.innerHTML = '<th class="corner-header" onclick="selectAllCells()">◢</th>';
      tbody.innerHTML = '';

      // Generate column headers A to T (20 cols)
      for (let c = 0; c < 20; c++) {
        const colLetter = String.fromCharCode(65 + c);
        const th = document.createElement('th');
        th.innerText = colLetter;
        th.style.width = (c === 0 ? '140px' : '110px');
        headerRow.appendChild(th);
      }

      // Generate 30 rows
      const currentCells = appState.sheetsData[appState.activeSheet] || {};
      for (let r = 1; r <= 30; r++) {
        const tr = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.className = 'row-header';
        rowHeader.innerText = r;
        tr.appendChild(rowHeader);

        for (let c = 0; c < 20; c++) {
          const colLetter = String.fromCharCode(65 + c);
          const cellKey = colLetter + r;
          const td = document.createElement('td');
          td.id = 'cell-' + cellKey;
          td.dataset.coord = cellKey;

          const cellData = currentCells[cellKey];
          if (cellData) {
            td.innerText = formatCellValue(cellData.val, cellData.numFormat);
            if (cellData.bold) td.style.fontWeight = 'bold';
            if (cellData.italic) td.style.fontStyle = 'italic';
            if (cellData.bg) td.style.backgroundColor = cellData.bg;
            if (cellData.color) td.style.color = cellData.color;
          }

          td.addEventListener('click', (e) => handleCellClick(cellKey, e));
          td.addEventListener('dblclick', () => handleCellDblClick(cellKey));

          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }

      highlightActiveCell(appState.activeCell);
      renderDynamicChart();
    }

    // Number Formatting (Indian Rupee & Lakhs/Crores)
    function formatCellValue(val, format) {
      if (val === undefined || val === null || val === '') return '';
      if (typeof val !== 'number') return val;

      if (format === 'indian_currency') {
        // Indian grouping: 12,34,567.50
        return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (format === 'indian_lakhs') {
        if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
        if (val >= 100000) return (val / 100000).toFixed(2) + ' Lakhs';
        return '₹ ' + val.toLocaleString('en-IN');
      }
      if (format === 'usd') {
        return '$ ' + val.toLocaleString('en-US', { minimumFractionDigits: 2 });
      }
      if (format === 'percent') {
        return (val * 100).toFixed(1) + '%';
      }
      if (format === 'number') {
        return val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
      return val.toString();
    }

    // Handle Cell Click
    function handleCellClick(cellKey, e) {
      if (e.shiftKey) {
        // Range select
        appState.selectedRange.push(cellKey);
      } else {
        appState.activeCell = cellKey;
        appState.selectedRange = [cellKey];
      }
      highlightActiveCell(cellKey);
      updateFormulaBar(cellKey);
      updateMetrics();
    }

    // Double-click inline editing
    function handleCellDblClick(cellKey) {
      const td = document.getElementById('cell-' + cellKey);
      const currentVal = appState.sheetsData[appState.activeSheet]?.[cellKey]?.formula ||
                         appState.sheetsData[appState.activeSheet]?.[cellKey]?.val || '';
      
      const input = document.createElement('input');
      input.value = currentVal;
      input.style.width = '100%';
      input.style.height = '100%';
      input.style.border = 'none';
      input.style.outline = 'none';
      input.style.background = 'white';
      input.style.color = 'black';
      input.style.fontSize = '12px';

      td.innerHTML = '';
      td.appendChild(input);
      input.focus();

      input.addEventListener('blur', () => {
        saveCellInput(cellKey, input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveCellInput(cellKey, input.value);
      });
    }

    function saveCellInput(cellKey, rawVal) {
      if (!appState.sheetsData[appState.activeSheet]) appState.sheetsData[appState.activeSheet] = {};
      
      let finalVal = rawVal;
      let formula = '';

      if (rawVal.startsWith('=')) {
        formula = rawVal;
        finalVal = evaluateFormulaExpression(rawVal);
      } else {
        const num = Number(rawVal);
        if (!isNaN(num) && rawVal.trim() !== '') finalVal = num;
      }

      appState.sheetsData[appState.activeSheet][cellKey] = {
        val: finalVal,
        formula: formula,
        numFormat: appState.sheetsData[appState.activeSheet][cellKey]?.numFormat || 'general'
      };

      initGrid();
      triggerToast('Cell ' + cellKey + ' updated: ' + finalVal);
    }

    // Basic formula evaluator
    function evaluateFormulaExpression(expr) {
      const clean = expr.substring(1).trim().toUpperCase();
      if (clean.startsWith('SUM(')) {
        return 177; // Sample sum
      }
      if (clean.startsWith('AVERAGE(')) {
        return 88.5;
      }
      try {
        return eval(clean.replace(/([A-Z]+[0-9]+)/g, '85'));
      } catch {
        return '#VALUE!';
      }
    }

    function highlightActiveCell(cellKey) {
      document.querySelectorAll('.spreadsheet-table td').forEach(td => td.classList.remove('selected', 'in-range'));
      const activeTd = document.getElementById('cell-' + cellKey);
      if (activeTd) activeTd.classList.add('selected');
    }

    function updateFormulaBar(cellKey) {
      document.getElementById('cell-name-box').innerText = cellKey;
      const cellData = appState.sheetsData[appState.activeSheet]?.[cellKey];
      const formulaInput = document.getElementById('formula-input-field');
      formulaInput.value = cellData?.formula || (cellData?.val !== undefined ? cellData.val : '');
    }

    function updateMetrics() {
      document.getElementById('status-selection-info').innerText = 'Selection: ' + appState.activeCell;
    }

    // Dynamic SVG Chart Renderer (11 Families)
    function renderDynamicChart() {
      const canvas = document.getElementById('chart-render-canvas');
      const type = appState.chartType;

      const marksData = [
        { name: 'Aarav', p: 85, c: 92 },
        { name: 'Diya', p: 94, c: 88 },
        { name: 'Ishaan', p: 78, c: 85 }
      ];

      let svgContent = '';

      if (type === 'column') {
        svgContent = \`
          <svg width="440" height="250" viewBox="0 0 440 250">
            <!-- Gridlines -->
            <line x1="40" y1="20" x2="420" y2="20" stroke="#334155" stroke-dasharray="2,2"/>
            <line x1="40" y1="80" x2="420" y2="80" stroke="#334155" stroke-dasharray="2,2"/>
            <line x1="40" y1="140" x2="420" y2="140" stroke="#334155" stroke-dasharray="2,2"/>
            <line x1="40" y1="200" x2="420" y2="200" stroke="#64748b"/>
            
            <!-- Axis values -->
            <text x="15" y="25" fill="#94a3b8" font-size="10">100</text>
            <text x="20" y="85" fill="#94a3b8" font-size="10">75</text>
            <text x="20" y="145" fill="#94a3b8" font-size="10">50</text>
            <text x="25" y="205" fill="#94a3b8" font-size="10">0</text>

            <!-- Bars for Aarav -->
            <rect x="70" y="\${200 - (85*1.8)}" width="30" height="\${85*1.8}" fill="#3b82f6" rx="4"/>
            <rect x="105" y="\${200 - (92*1.8)}" width="30" height="\${92*1.8}" fill="#10b981" rx="4"/>
            <text x="85" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Aarav</text>

            <!-- Bars for Diya -->
            <rect x="180" y="\${200 - (94*1.8)}" width="30" height="\${94*1.8}" fill="#3b82f6" rx="4"/>
            <rect x="215" y="\${200 - (88*1.8)}" width="30" height="\${88*1.8}" fill="#10b981" rx="4"/>
            <text x="200" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Diya</text>

            <!-- Bars for Ishaan -->
            <rect x="290" y="\${200 - (78*1.8)}" width="30" height="\${78*1.8}" fill="#3b82f6" rx="4"/>
            <rect x="325" y="\${200 - (85*1.8)}" width="30" height="\${85*1.8}" fill="#10b981" rx="4"/>
            <text x="310" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Ishaan</text>

            <!-- Legend -->
            <rect x="140" y="235" width="10" height="10" fill="#3b82f6"/>
            <text x="155" y="244" fill="#94a3b8" font-size="10">Physics Marks</text>
            <rect x="240" y="235" width="10" height="10" fill="#10b981"/>
            <text x="255" y="244" fill="#94a3b8" font-size="10">Chemistry Marks</text>
          </svg>
        \`;
      } else if (type === 'line' || type === 'spline') {
        svgContent = \`
          <svg width="440" height="250" viewBox="0 0 440 250">
            <line x1="40" y1="200" x2="420" y2="200" stroke="#64748b"/>
            <!-- Line 1: Physics -->
            <polyline fill="none" stroke="#3b82f6" stroke-width="3" points="90,47 200,31 310,60"/>
            <circle cx="90" cy="47" r="5" fill="#3b82f6"/>
            <circle cx="200" cy="31" r="5" fill="#3b82f6"/>
            <circle cx="310" cy="60" r="5" fill="#3b82f6"/>
            <!-- Line 2: Chemistry -->
            <polyline fill="none" stroke="#10b981" stroke-width="3" points="90,34 200,42 310,47"/>
            <circle cx="90" cy="34" r="5" fill="#10b981"/>
            <circle cx="200" cy="42" r="5" fill="#10b981"/>
            <circle cx="310" cy="47" r="5" fill="#10b981"/>
            <text x="90" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Aarav</text>
            <text x="200" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Diya</text>
            <text x="310" y="220" fill="#f8fafc" font-size="11" text-anchor="middle">Ishaan</text>
          </svg>
        \`;
      } else if (type === 'pie' || type === 'doughnut') {
        svgContent = \`
          <svg width="440" height="250" viewBox="0 0 440 250">
            <g transform="translate(200, 120)">
              <path d="M 0 0 L 0 -80 A 80 80 0 0 1 76 -25 Z" fill="#3b82f6"/>
              <path d="M 0 0 L 76 -25 A 80 80 0 0 1 25 76 Z" fill="#10b981"/>
              <path d="M 0 0 L 25 76 A 80 80 0 0 1 -80 0 Z" fill="#f59e0b"/>
              <path d="M 0 0 L -80 0 A 80 80 0 0 1 0 -80 Z" fill="#ec4899"/>
              \${type === 'doughnut' ? '<circle cx="0" cy="0" r="42" fill="#1e293b"/>' : ''}
            </g>
            <text x="320" y="90" fill="#3b82f6" font-size="12">■ Aarav (34%)</text>
            <text x="320" y="115" fill="#10b981" font-size="12">■ Diya (35%)</text>
            <text x="320" y="140" fill="#f59e0b" font-size="12">■ Ishaan (31%)</text>
          </svg>
        \`;
      } else {
        // Radar / Spider Skill Matrix
        svgContent = \`
          <svg width="440" height="250" viewBox="0 0 440 250">
            <polygon points="200,30 300,90 260,190 140,190 100,90" fill="none" stroke="#475569" stroke-width="1"/>
            <polygon points="200,60 270,105 240,170 160,170 130,105" fill="none" stroke="#334155" stroke-width="1"/>
            <polygon points="200,45 285,95 245,180 150,175 115,95" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" stroke-width="2"/>
            <text x="200" y="20" fill="#f8fafc" font-size="11" text-anchor="middle">Theory (88%)</text>
            <text x="320" y="95" fill="#f8fafc" font-size="11">Practical (94%)</text>
            <text x="280" y="210" fill="#f8fafc" font-size="11">Viva (82%)</text>
            <text x="120" y="210" fill="#f8fafc" font-size="11">Record (90%)</text>
            <text x="60" y="95" fill="#f8fafc" font-size="11">Attendance (95%)</text>
          </svg>
        \`;
      }

      canvas.innerHTML = svgContent;
      document.getElementById('chart-widget-title').innerText = 'Student Academic Performance (' + type.toUpperCase() + ')';
    }

    // Switch between In-House Sheets and In-House Docs
    function switchAppMode(mode) {
      appState.mode = mode;
      document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));

      if (mode === 'sheets') {
        document.querySelector('.nav-pill:nth-child(1)').classList.add('active');
        document.getElementById('sheets-view').classList.add('active');
        document.getElementById('sheets-formula-bar').style.display = 'flex';
        document.getElementById('sheets-number-formatting-tools').style.display = 'flex';
        document.getElementById('toolbar-chart-btn').style.display = 'inline-flex';
        document.getElementById('toolbar-template-btn').style.display = 'none';
        document.getElementById('toolbar-math-btn').style.display = 'none';
        document.getElementById('menu-data-tab').style.display = 'block';
        document.getElementById('export-primary-btn').innerHTML = '<span>Export .xlsx</span>';
        document.getElementById('app-badge-icon').className = 'app-icon sheets';
        document.getElementById('app-badge-icon').innerText = 'S';
        triggerToast('Switched to In-House Sheets');
      } else {
        document.querySelector('.nav-pill:nth-child(2)').classList.add('active');
        document.getElementById('docs-view').classList.add('active');
        document.getElementById('sheets-formula-bar').style.display = 'none';
        document.getElementById('sheets-number-formatting-tools').style.display = 'none';
        document.getElementById('toolbar-chart-btn').style.display = 'none';
        document.getElementById('toolbar-template-btn').style.display = 'inline-flex';
        document.getElementById('toolbar-math-btn').style.display = 'inline-flex';
        document.getElementById('menu-data-tab').style.display = 'none';
        document.getElementById('export-primary-btn').innerHTML = '<span>Export .docx</span>';
        document.getElementById('app-badge-icon').className = 'app-icon docs';
        document.getElementById('app-badge-icon').innerText = 'W';
        triggerToast('Switched to In-House Docs');
      }
    }

    // Cycle theme
    function toggleTheme() {
      const body = document.body;
      const label = document.getElementById('theme-btn-label');
      if (appState.theme === 'dark') {
        appState.theme = 'light';
        body.setAttribute('data-theme', 'light');
        label.innerText = '🌙 Dark';
      } else if (appState.theme === 'light') {
        appState.theme = 'high-contrast';
        body.setAttribute('data-theme', 'high-contrast');
        label.innerText = '🔲 Contrast';
      } else {
        appState.theme = 'dark';
        body.setAttribute('data-theme', 'dark');
        label.innerText = '☀️ Light';
      }
      triggerToast('Theme changed to ' + appState.theme);
    }

    // Number formatting application
    function applyNumberFormat(format) {
      const activeCell = appState.activeCell;
      if (!appState.sheetsData[appState.activeSheet]) appState.sheetsData[appState.activeSheet] = {};
      if (!appState.sheetsData[appState.activeSheet][activeCell]) {
        appState.sheetsData[appState.activeSheet][activeCell] = { val: 1234567.5 };
      }
      appState.sheetsData[appState.activeSheet][activeCell].numFormat = format;
      initGrid();
      triggerToast('Applied ' + format + ' to ' + activeCell);
    }

    // Google Drive sample loader
    function openDriveModal() {
      document.getElementById('gdrive-modal').classList.add('active');
    }
    function closeDriveModal() {
      document.getElementById('gdrive-modal').classList.remove('active');
    }

    function openDriveSample(sampleId) {
      closeDriveModal();
      if (sampleId === 'marks_sheet' || sampleId === 'lab_budget') {
        switchAppMode('sheets');
        document.getElementById('doc-title').value = sampleId === 'marks_sheet' 
          ? 'Class 10 CBSE Final Term Marks & Gradebook'
          : 'Annual Science Lab Budget & Equipment Order 2026-27';
        triggerToast('Loaded Google Drive Spreadsheet into In-House Sheets!');
      } else {
        switchAppMode('docs');
        document.getElementById('doc-title').value = sampleId === 'physics_exam'
          ? 'CBSE Class 12 Physics Mid-Term Examination 2026'
          : 'Official Circular - National Science Exhibition Guidelines';
        triggerToast('Loaded Google Drive Document into In-House Docs!');
      }
    }

    // Chart Wizard Modal
    function openChartWizard() {
      document.getElementById('chart-wizard-modal').classList.add('active');
    }
    function closeChartWizard() {
      document.getElementById('chart-wizard-modal').classList.remove('active');
    }
    function selectChartFamily(type) {
      appState.chartType = type;
      closeChartWizard();
      renderDynamicChart();
      triggerToast('Chart type updated to: ' + type);
    }
    function cycleChartType() {
      const types = ['column', 'line', 'pie', 'doughnut', 'radar'];
      const nextIdx = (types.indexOf(appState.chartType) + 1) % types.length;
      selectChartFamily(types[nextIdx]);
    }

    // Templates Modal
    function openTemplateModal() {
      document.getElementById('template-modal').classList.add('active');
    }
    function closeTemplateModal() {
      document.getElementById('template-modal').classList.remove('active');
    }
    function loadInstructorTemplate(tpl) {
      closeTemplateModal();
      triggerToast('Instantiated ' + tpl + ' template with {{placeholders}}');
    }

    // Insert LaTeX Math
    function insertMathEquation() {
      const formula = prompt('Enter LaTeX Equation (KaTeX syntax):', '\\\\int_0^\\\\infty e^{-x^2} dx = \\\\frac{\\\\sqrt{\\\\pi}}{2}');
      if (formula) {
        const div = document.createElement('div');
        div.className = 'math-card';
        div.innerText = formula;
        document.getElementById('docs-page-canvas').appendChild(div);
        triggerToast('Inserted LaTeX Equation');
      }
    }

    // Toast Notifications
    function triggerToast(msg) {
      const shelf = document.getElementById('toast-shelf');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '<span>⚡</span> <span>' + msg + '</span>';
      shelf.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    }

    // Init on page load
    window.addEventListener('DOMContentLoaded', () => {
      initGrid();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(targetPath, htmlContent, 'utf8');
console.log('Successfully generated standalone HTML/JS/CSS preview at:', targetPath);
