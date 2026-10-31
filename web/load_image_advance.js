import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const NODE_CLASS = "HonorLeeLoadImageAdvance";
const CSS_ID = "honorlee-load-image-advance-css";
const PANEL_WIDGET = "hl_lia_panel";
const LEGACY_PANEL_WIDGETS = ["hl_lia_toolbar", "hl_lia_preview"];
const CORE_IMAGE_PREVIEW = "$$canvas-image-preview";
const THUMB_SIZES = [64, 128, 256];
const TOOLBAR_H = 40;
const PREVIEW_TOP = 45;
const PREVIEW_META_H = 20;
const PREVIEW_MIN_H = 160;
const IMAGE_PROPERTY_KEY = "hl_lia_image";

function chainCallback(object, property, fn) {
  if (object == null) return;
  const old = object[property];
  object[property] = function (...args) {
    const ret = old?.apply(this, args);
    const cbRet = fn.apply(this, args);
    return cbRet !== undefined ? cbRet : ret;
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text, title) {
  const node = el("button", className, text);
  node.type = "button";
  if (title) node.title = title;
  return node;
}

function ensureCss() {
  let style = document.getElementById(CSS_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = CSS_ID;
    document.head.append(style);
  }
  style.textContent = `
.hl-lia-overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px;pointer-events:auto}
.hl-lia-dialog{width:min(920px,96vw);max-height:min(88vh,900px);display:flex;flex-direction:column;border:1px solid #555;border-radius:10px;background:#1a1a1a;box-shadow:0 16px 48px rgba(0,0,0,.65);overflow:hidden;font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#d4d4d4}
.hl-lia-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #333}
.hl-lia-head h2{flex:1;margin:0;font:600 14px/1.3 inherit;color:#fff}
.hl-lia-close{flex:0 0 28px;width:28px;height:28px;border:1px solid #555;border-radius:6px;background:#252525;color:#ccc;cursor:pointer;font:700 14px/1 sans-serif}
.hl-lia-body{flex:1;min-height:0;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.hl-lia-foot{padding:10px 14px;border-top:1px solid #333;display:flex;gap:8px;justify-content:flex-end}
.hl-lia-foot button{padding:6px 14px;border:1px solid #555;border-radius:6px;background:#252525;color:#ddd;cursor:pointer;font:inherit}
.hl-lia-tabs{display:flex;gap:6px}
.hl-lia-tabs button{padding:5px 10px;border:1px solid #444;border-radius:6px;background:#222;color:#aaa;cursor:pointer;font:inherit}
.hl-lia-tabs button.on{border-color:#6a9fb5;color:#fff;background:#2a3a42}
.hl-lia-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.hl-lia-crumb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;color:#999;flex:1;min-width:0}
.hl-lia-crumb button{border:none;background:none;color:#6a9fb5;cursor:pointer;font:inherit;padding:0}
.hl-lia-sizes{display:flex;gap:4px;flex-shrink:0}
.hl-lia-sizes button{padding:4px 8px;border:1px solid #444;border-radius:6px;background:#222;color:#aaa;cursor:pointer;font:inherit;font-size:11px}
.hl-lia-sizes button.on{border-color:#6a9fb5;color:#fff;background:#2a3a42}
.hl-lia-foldlist{display:flex;flex-wrap:wrap;gap:4px}
.hl-lia-foldlist button{padding:4px 8px;border:1px solid #333;border-radius:6px;background:#222;color:#ccc;cursor:pointer;font:inherit}
.hl-lia-foldlist button:hover{border-color:#555;color:#fff}
.hl-lia-grid{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;min-height:120px;max-height:min(52vh,520px);overflow:auto;padding:2px}
.hl-lia-cell{position:relative;flex:0 0 auto;border:1px solid #333;border-radius:6px;overflow:hidden;cursor:pointer;background:#0d0d0d;padding:0}
.hl-lia-cell:hover{border-color:#6a9fb5}
.hl-lia-cell img{width:100%;height:100%;object-fit:cover;display:block}
.hl-lia-label{position:absolute;left:0;right:0;bottom:0;padding:3px 5px;background:rgba(0,0,0,.62);color:#eee;font-size:10px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.hl-lia-del{position:absolute;top:3px;right:3px;width:20px;height:20px;border:none;border-radius:4px;background:rgba(0,0,0,.55);color:#faa;cursor:pointer;font:12px/1 sans-serif;display:grid;place-items:center;padding:0;opacity:.85}
.hl-lia-del:hover{background:rgba(80,20,20,.85);color:#fff;opacity:1}
.hl-lia-empty{color:#888;padding:12px 4px}
.hl-lia-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10060;padding:8px 14px;border-radius:8px;background:#2a2020;border:1px solid #844;color:#faa;font:12px/1.3 sans-serif;pointer-events:none}
.hl-lia-bar{box-sizing:border-box;width:100%;height:40px;min-height:40px;max-height:40px;display:flex;align-items:stretch;gap:6px;pointer-events:auto;font:12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hl-lia-bar *{box-sizing:border-box}
.hl-lia-pick{height:40px;min-height:40px;max-height:40px;flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #444;border-radius:8px;background:linear-gradient(180deg,#252525 0%,#1a1a1a 100%);color:#e8e8e8;cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s}
.hl-lia-mask-btn,.hl-lia-clear-btn{flex:0 0 40px;width:40px;height:40px;min-height:40px;padding:0;border:1px solid #3d5a68;border-radius:8px;background:linear-gradient(180deg,#243840 0%,#1a2a30 100%);color:#c8e6f0;cursor:pointer;display:grid;place-items:center;transition:border-color .15s,color .15s}
.hl-lia-clear-btn{border-color:#484848;background:linear-gradient(180deg,#2a2a2a 0%,#1c1c1c 100%);color:#aaa}
.hl-lia-mask-btn:hover:not(:disabled),.hl-lia-clear-btn:hover:not(:disabled){border-color:#6a9fb5;color:#fff}
.hl-lia-mask-btn:disabled,.hl-lia-clear-btn:disabled{opacity:.45;cursor:default}
.hl-lia-pick:hover{border-color:#6a9fb5;box-shadow:0 0 0 1px rgba(106,159,181,.25)}
.hl-lia-pick:active{transform:translateY(1px)}
.hl-lia-pick-icon{flex-shrink:0;display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:rgba(106,159,181,.15);color:#8ecae6}
.hl-lia-pick-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.hl-lia-pick-chev{flex-shrink:0;color:#888;opacity:.85}
[data-node-id].hl-lia-node [data-widget-name="image"],
[data-node-id].hl-lia-node [data-widget-name="upload"]{display:none!important}
[data-node-id].hl-lia-node [data-widget-name="${PANEL_WIDGET}"]{position:relative!important;overflow:visible!important}
.hl-lia-shell{position:relative;width:100%;box-sizing:border-box;pointer-events:auto;font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.hl-lia-shell *{box-sizing:border-box}
.hl-lia-shell > .hl-lia-bar{position:absolute;top:0;left:0;right:0;height:${TOOLBAR_H}px;margin:0}
.hl-lia-shell > .hl-lia-preview-meta{position:absolute;bottom:0;left:0;right:0;height:${PREVIEW_META_H}px;line-height:${PREVIEW_META_H}px;margin:0;text-align:center;font-size:10px;color:#888;font-variant-numeric:tabular-nums;letter-spacing:.02em;pointer-events:none}
.hl-lia-shell > .hl-lia-preview-stage{position:absolute;top:${PREVIEW_TOP}px;bottom:${PREVIEW_META_H}px;left:0;right:0;overflow:hidden;background:transparent;border:none;padding:0;margin:0}
.hl-lia-preview-stage.hl-lia-drag{outline:1px dashed #6a9fb5;outline-offset:-1px}
.hl-lia-preview-stage.hl-lia-busy{opacity:.75;pointer-events:none}
.hl-lia-preview-empty{position:absolute;inset:0;display:grid;place-items:center;padding:8px;text-align:center;color:#888;font-size:11px;line-height:1.45;pointer-events:none;white-space:pre-line}
.hl-lia-preview-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none}
.hl-lia-preview-frame[hidden]{display:none!important}
.hl-lia-preview-img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;object-position:center}
.hl-lia-cell.hl-lia-cell-sel{outline:2px solid #6a9fb5;outline-offset:1px}
`;
}

function keepDomWidgetWidthAuto(widget) {
  if (!widget) return;
  try {
    Object.defineProperty(widget, "width", {
      get() {
        return undefined;
      },
      set() {},
      configurable: true,
    });
  } catch (_e) {
    /* frozen */
  }
}

function svgIcon(viewBox, paths, size = 14) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  for (const spec of paths) {
    const node = document.createElementNS(ns, spec.tag);
    for (const [key, val] of Object.entries(spec.attrs)) node.setAttribute(key, val);
    svg.append(node);
  }
  return svg;
}

function imagePickIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      fill: "currentColor",
      d: "M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm2 2l2.2 2.8L9 6l3 4H4V5z",
    },
  }], 16);
}

function chevronIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      d: "M4 6l4 4 4-4",
    },
  }], 14);
}

function maskEditIcon() {
  return svgIcon("0 0 16 16", [
    {
      tag: "path",
      attrs: {
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.35",
        "stroke-linejoin": "round",
        d: "M2.5 10.5V13h2.5l7.2-7.2a1.2 1.2 0 00-1.7-1.7L3.3 11.3z",
      },
    },
    {
      tag: "path",
      attrs: {
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.35",
        "stroke-linecap": "round",
        d: "M9.5 3.5l3 3",
      },
    },
    {
      tag: "circle",
      attrs: {
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.1",
        cx: "5.5",
        cy: "5.5",
        r: "2.8",
        opacity: "0.85",
      },
    },
  ], 18);
}

function clearImageIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      d: "M4 4l8 8M12 4l-8 8",
    },
  }], 16);
}

function findNodeHost(node) {
  const id = node?.id;
  if (id == null) return null;
  return document.querySelector(`[data-node-id="${id}"]`);
}

function markNodeHost(node) {
  const host = findNodeHost(node);
  if (host) host.classList.add("hl-lia-node");
}

let maskEditorApiPromise = null;

async function resolveUseMaskEditorModuleUrl() {
  for (const el of document.querySelectorAll("script[src]")) {
    const u = el.src;
    if (u && /\/assets\/useMaskEditor-[^/]+\.js/.test(u)) return u;
  }
  for (const entry of performance.getEntriesByType("resource")) {
    const u = entry.name;
    if (/\/assets\/useMaskEditor-[^/]+\.js/.test(u)) return u;
  }

  const seeds = [
    ...new Set(
      [...document.querySelectorAll("script[type=module][src], script[src*='/assets/']")]
        .map((s) => s.src)
        .filter((u) => u && /\/assets\/(index|main|GraphView|core|app)-/.test(u)),
    ),
  ];
  const seen = new Set();
  const queue = [...seeds];
  let steps = 0;
  while (queue.length && steps < 24) {
    const seed = queue.shift();
    steps += 1;
    if (!seed || seen.has(seed)) continue;
    seen.add(seed);
    try {
      const text = await (await fetch(seed)).text();
      const hit = text.match(/useMaskEditor-[A-Za-z0-9_-]+\.js/);
      if (hit) return new URL(`./${hit[0]}`, seed).href;
      for (const m of text.matchAll(
        /\.\/(index|main|GraphView|core|app|useMoreOptionsMenu|useImageMenuOptions|useMaskEditor)-[A-Za-z0-9_-]+\.js/g,
      )) {
        queue.push(new URL(m[0], seed).href);
      }
    } catch (_e) {
      /* try next bundle */
    }
  }
  return null;
}

async function getMaskEditorApi() {
  if (!maskEditorApiPromise) {
    maskEditorApiPromise = (async () => {
      const src = await resolveUseMaskEditorModuleUrl();
      if (!src) return null;
      const mod = await import(/* @vite-ignore */ src);
      const hook = mod.t ?? mod.useMaskEditor;
      return typeof hook === "function" ? hook() : null;
    })().catch((err) => {
      maskEditorApiPromise = null;
      console.warn("[HonorLee LoadImageAdvance] useMaskEditor import failed:", err);
      return null;
    });
  }
  return maskEditorApiPromise;
}

async function openMaskEditorForNode(node) {
  node.__hlLiaPreview?.refresh?.();
  if (!node.imgs?.length && node.previewMediaType !== "image") {
    toast("请先加载图片");
    return;
  }
  app.canvas?.selectNode?.(node);
  const editor = await getMaskEditorApi();
  if (!editor?.openMaskEditor) {
    toast("无法加载遮罩编辑器，请刷新页面后重试");
    return;
  }
  editor.openMaskEditor(node);
}

function suppressOfficialPreview(node) {
  node.hideOutputImages = true;
  node.previewMediaType = "image";

  for (const w of node.widgets || []) {
    if (w?.name === CORE_IMAGE_PREVIEW) hideCoreCanvasPreview(w);
  }

  collapseNativeWidget(node.widgets?.find((w) => w.name === "upload"));

  if (node.__hlLiaPreviewHooked) return;
  node.__hlLiaPreviewHooked = true;

  if (typeof node.addCustomWidget === "function") {
    const priorAdd = node.addCustomWidget;
    node.addCustomWidget = function (customWidget) {
      if (customWidget?.name === CORE_IMAGE_PREVIEW) hideCoreCanvasPreview(customWidget);
      return priorAdd.call(this, customWidget);
    };
  }

  let nodeImgs = undefined;
  Object.defineProperty(node, "imgs", {
    configurable: true,
    enumerable: true,
    get() {
      return nodeImgs;
    },
    set(value) {
      nodeImgs = value;
      queueMicrotask(() => node.__hlLiaPreview?.follow?.());
    },
  });
}

async function uploadImageFile(file, node, imageWidget) {
  const body = new FormData();
  body.append("image", file);
  body.append("type", "input");
  body.append("subfolder", "");
  const res = await fetch(api.apiURL("/upload/image"), { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "upload failed");
  const folder = data.subfolder ? String(data.subfolder).replace(/\\/g, "/") : "";
  applyImageSelection(node, imageWidget, "input", folder, data.name || file.name);
}

function displayImageLabel(value) {
  if (!value) return "选择图像…";
  let path = String(value);
  if (path.endsWith("]")) path = path.slice(0, path.lastIndexOf("[")).trim();
  const name = basename(path);
  return name || path;
}

function collapseNativeWidget(widget) {
  if (!widget || widget.__hlLiaCollapsed) return;
  widget.__hlLiaCollapsed = true;
  widget.hidden = true;
  widget._hidden = true;
  widget.computeSize = () => [0, -4];
  widget.computeLayoutSize = () => ({ minWidth: 0, minHeight: 0 });
  widget.draw = () => {};
  widget.mouse = () => false;
  if (widget.element) widget.element.style.display = "none";
}

function hideCoreCanvasPreview(widget) {
  collapseNativeWidget(widget);
}

function syncToolbar(state, value) {
  if (!state?.labelMain) return;
  state.labelMain.textContent = displayImageLabel(value);
}

function panelMinHeight() {
  return PREVIEW_TOP + PREVIEW_META_H + PREVIEW_MIN_H;
}

function collapseLegacyPanelWidgets(node) {
  for (const w of node.widgets || []) {
    if (LEGACY_PANEL_WIDGETS.includes(w.name)) collapseNativeWidget(w);
  }
}

function buildImagePanel(node, imageWidget, openPicker, openMaskEditor, onClearImage) {
  if (node.__hlLiaPreview) return node.__hlLiaPreview;
  ensureCss();
  collapseLegacyPanelWidgets(node);

  const shell = el("div", "hl-lia-shell");

  const bar = el("div", "hl-lia-bar");
  const pickBtn = button("hl-lia-pick");
  const pickIcon = el("span", "hl-lia-pick-icon");
  pickIcon.append(imagePickIcon());
  const labelMain = el("span", "hl-lia-pick-text", "选择图像…");
  const pickChev = el("span", "hl-lia-pick-chev");
  pickChev.append(chevronIcon());
  pickBtn.append(pickIcon, labelMain, pickChev);

  const maskBtn = button("hl-lia-mask-btn", "", "编辑遮罩");
  maskBtn.append(maskEditIcon());
  maskBtn.disabled = true;
  maskBtn.setAttribute("aria-label", "编辑遮罩");

  const clearBtn = button("hl-lia-clear-btn", "", "清除已选图片");
  clearBtn.append(clearImageIcon());
  clearBtn.disabled = true;
  clearBtn.setAttribute("aria-label", "清除已选图片");

  bar.append(pickBtn, maskBtn, clearBtn);

  const stage = el("div", "hl-lia-preview-stage");
  const empty = el("div", "hl-lia-preview-empty", "拖入图片到此处上传\n或双击打开选图");
  const frame = el("div", "hl-lia-preview-frame");
  frame.hidden = true;
  const img = document.createElement("img");
  img.className = "hl-lia-preview-img";
  img.alt = "";
  img.draggable = false;
  frame.append(img);
  stage.append(empty, frame);

  const meta = el("div", "hl-lia-preview-meta");
  shell.append(bar, stage, meta);

  shell.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) e.stopPropagation();
  });

  pickBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPicker();
  });

  maskBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMaskEditor?.();
  });

  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClearImage?.();
  });

  const state = {
    shell,
    stage,
    empty,
    frame,
    img,
    meta,
    loadSerial: 0,
    shown: "",
    domWidget: null,
  };

  node.__hlLiaToolbar = { labelMain, maskBtn, clearBtn, imageWidget };
  syncToolbar(node.__hlLiaToolbar, imageWidget.value);

  function syncMeta() {
    const hasPick = Boolean(String(imageWidget.value ?? "").trim());
    clearBtn.disabled = !hasPick;
    if (!frame.hidden && img.complete && img.naturalWidth > 0) {
      meta.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      maskBtn.disabled = false;
    } else {
      meta.textContent = "";
      maskBtn.disabled = true;
    }
  }

  function syncImgs() {
    if (!frame.hidden && img.complete && img.naturalWidth > 0) {
      node.imgs = [img];
      node.imageIndex = 0;
      node.previewMediaType = "image";
    } else {
      node.imgs = undefined;
    }
    syncMeta();
    app.graph?.setDirtyCanvas(true, true);
  }

  state.applyLayout = () => {
    shell.style.minHeight = `${panelMinHeight()}px`;
  };

  state.refresh = () => {
    const serial = ++state.loadSerial;
    const value = String(imageWidget.value ?? "").trim();
    state.shown = value;
    if (!value) {
      img.removeAttribute("src");
      frame.hidden = true;
      empty.hidden = false;
      empty.textContent = "拖入图片到此处上传\n或双击打开选图";
      stage.classList.remove("hl-lia-has-img");
      syncImgs();
      return;
    }
    const url = formatViewUrl(value);
    if (!url) {
      frame.hidden = true;
      empty.hidden = false;
      empty.textContent = "无法解析图片路径";
      stage.classList.remove("hl-lia-has-img");
      syncImgs();
      return;
    }
    img.onload = () => {
      if (serial !== state.loadSerial) return;
      frame.hidden = false;
      empty.hidden = true;
      stage.classList.add("hl-lia-has-img");
      syncImgs();
    };
    img.onerror = () => {
      if (serial !== state.loadSerial) return;
      frame.hidden = true;
      empty.hidden = false;
      empty.textContent = "预览加载失败";
      stage.classList.remove("hl-lia-has-img");
      syncImgs();
    };
    img.src = url;
  };

  state.follow = () => {
    const value = String(imageWidget.value ?? "");
    if (value !== state.shown) state.refresh();
  };

  async function uploadFiles(files) {
    const file = files?.[0];
    if (!file?.type?.startsWith("image/")) return;
    stage.classList.add("hl-lia-busy");
    try {
      await uploadImageFile(file, node, imageWidget);
    } catch (err) {
      toast(String(err.message || err));
    } finally {
      stage.classList.remove("hl-lia-busy");
    }
  }

  stage.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    stage.classList.add("hl-lia-drag");
  });
  stage.addEventListener("dragleave", () => stage.classList.remove("hl-lia-drag"));
  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    stage.classList.remove("hl-lia-drag");
    uploadFiles([...(e.dataTransfer?.files || [])]);
  });
  stage.addEventListener("dblclick", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPicker();
  });

  let domWidget = node.widgets?.find((w) => w.name === PANEL_WIDGET);
  if (!domWidget) {
    domWidget = node.addDOMWidget(PANEL_WIDGET, PANEL_WIDGET, shell, {
      serialize: false,
      hideOnZoom: false,
    });
  } else if (domWidget.element !== shell) {
    domWidget.element = shell;
  }
  domWidget.serialize = false;
  keepDomWidgetWidthAuto(domWidget);
  const panelH = panelMinHeight();
  domWidget.computeLayoutSize = () => ({
    minWidth: 0,
    minHeight: panelH,
  });
  domWidget.options ??= {};
  domWidget.options.minNodeSize = [240, panelH];

  node.widgets = [...(node.widgets || []).filter((w) => w !== domWidget), domWidget];
  state.domWidget = domWidget;
  node.__hlLiaPreview = state;

  state.applyLayout();
  state.refresh();
  queueMicrotask(() => markNodeHost(node));
  return state;
}

function toast(msg) {
  ensureCss();
  const node = el("div", "hl-lia-toast", msg);
  document.body.append(node);
  setTimeout(() => node.remove(), 2800);
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "request failed");
  return data;
}

function toWidgetValue(source, folder, name) {
  const rel = [folder, name].filter(Boolean).join("/");
  return source === "output" ? `${rel}[output]` : rel;
}

function basename(path) {
  const parts = String(path || "").split("/");
  return parts[parts.length - 1] || path;
}

function formatViewUrl(value) {
  if (!value) return "";
  let url = String(value);
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  if (url.startsWith("/view") || url.startsWith("/api/view")) return url;

  let type = "input";
  if (url.endsWith("]")) {
    const open = url.lastIndexOf("[");
    if (open >= 0) {
      type = url.slice(open + 1, url.length - 1).trim();
      url = url.slice(0, open).trim();
    }
  }

  const parts = url.split("/");
  const filename = parts.pop();
  const subfolder = parts.join("/");
  const params = [
    "filename=" + encodeURIComponent(filename),
    "type=" + encodeURIComponent(type),
    "subfolder=" + encodeURIComponent(subfolder),
    app.getRandParam().substring(1),
  ].join("&");
  return api.apiURL(`/view?${params}`);
}

function thumbUrl(source, folder, name, v, size) {
  const params = new URLSearchParams({
    source,
    folder: folder || "",
    name,
    size: String(size),
    t: String(v || Date.now() % 1e7),
  });
  return `/honorlee/media/thumb?${params}`;
}

function ensureComboOption(widget, value) {
  const values = widget.options?.values;
  if (Array.isArray(values) && value && !values.includes(value)) {
    values.push(value);
  }
}

function isPersistedWidget(widget) {
  return (
    widget?.name &&
    widget.serialize !== false &&
    widget.options?.serialize !== false &&
    widget.type !== "button"
  );
}

function widgetsToDict(widgets) {
  const out = {};
  for (const widget of widgets || []) {
    if (!isPersistedWidget(widget)) continue;
    out[widget.name] = widget.value;
  }
  return out;
}

function hasImageStore(node) {
  return node.properties != null && IMAGE_PROPERTY_KEY in node.properties;
}

function readImageStoreProperty(node) {
  if (!hasImageStore(node)) return undefined;
  return String(node.properties[IMAGE_PROPERTY_KEY] ?? "").trim();
}

function persistImageStore(node, value) {
  node.properties ??= {};
  node.properties[IMAGE_PROPERTY_KEY] = String(value ?? "").trim();
}

function imageValueFromLegacyWidgetsValues(node, stored) {
  if (!Array.isArray(stored)) return "";
  let index = 0;
  for (const widget of node.widgets || []) {
    if (!isPersistedWidget(widget)) continue;
    if (widget.name === "image") {
      if (index >= stored.length) return "";
      const v = stored[index];
      return v != null ? String(v).trim() : "";
    }
    index += 1;
  }
  return "";
}

function resolveStoredImageValue(node, configureInfo) {
  const fromProp = readImageStoreProperty(node);
  if (fromProp !== undefined) return fromProp;

  const stored = configureInfo?.widgets_values ?? node.widgets_values;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    if ("image" in stored) {
      return stored.image == null ? "" : String(stored.image).trim();
    }
    if (IMAGE_PROPERTY_KEY in stored) {
      return String(stored[IMAGE_PROPERTY_KEY] ?? "").trim();
    }
  }
  if (Array.isArray(stored)) {
    return imageValueFromLegacyWidgetsValues(node, stored);
  }
  return undefined;
}

function applyImageWidgetValueQuiet(node, widget, value) {
  const v = String(value ?? "").trim();
  if (v) ensureComboOption(widget, v);
  widget.value = v;
  if (typeof widget.setValue === "function") {
    widget.setValue(v, { node, canvas: app.canvas });
  }
}

function restoreImageWidgetFromStore(node, configureInfo) {
  const widget = node.widgets?.find((w) => w.name === "image");
  if (!widget) return;

  const saved = resolveStoredImageValue(node, configureInfo);
  if (saved === undefined) return;

  const current = String(widget.value ?? "").trim();
  if (current === saved) return;

  applyImageWidgetValueQuiet(node, widget, saved);
}

function writeImageWidgetValue(node, widget, value) {
  persistImageStore(node, value);
  widget.value = value;
  if (typeof widget.setValue === "function") {
    widget.setValue(value, { node, canvas: app.canvas });
  }
  widget.__hlLiaOrigCallback?.(value);
}

function syncImageWidgetState(node) {
  const widget = node.widgets?.find((w) => w.name === "image");
  if (!widget) return;
  const value = String(widget.value ?? "").trim();
  if (value) ensureComboOption(widget, value);
  syncToolbar(node.__hlLiaToolbar, value);
  node.__hlLiaPreview?.refresh?.();
}

function clearImageSelection(node, widget) {
  if (!widget || node.__hlLiaApplying) return;
  node.__hlLiaApplying = true;
  try {
    writeImageWidgetValue(node, widget, "");
    syncToolbar(node.__hlLiaToolbar, "");
    node.__hlLiaPreview?.refresh?.();
    app.graph?.setDirtyCanvas?.(true, true);
  } finally {
    queueMicrotask(() => {
      node.__hlLiaApplying = false;
    });
  }
}

function applyImageSelection(node, widget, source, folder, name) {
  if (node.__hlLiaApplying) return;
  node.__hlLiaApplying = true;
  try {
    const value = toWidgetValue(source, folder, name);
    ensureComboOption(widget, value);
    writeImageWidgetValue(node, widget, value);
    syncToolbar(node.__hlLiaToolbar, value);
    node.__hlLiaPreview?.refresh?.();
    app.graph?.setDirtyCanvas(true, true);
  } finally {
    queueMicrotask(() => {
      node.__hlLiaApplying = false;
    });
  }
}

function openImagePicker(onPick) {
  ensureCss();
  let source = "input";
  let folder = "";
  let thumbSize = THUMB_SIZES[0];

  const overlay = el("div", "hl-lia-overlay");
  const dialog = el("div", "hl-lia-dialog");
  const head = el("div", "hl-lia-head");
  head.append(el("h2", null, "选择图像"));
  const closeBtn = button("hl-lia-close", "×", "关闭");
  head.append(closeBtn);

  const bodyEl = el("div", "hl-lia-body");
  const tabs = el("div", "hl-lia-tabs");
  const tabInput = button("", "上传资源", "ComfyUI input");
  const tabOutput = button("", "生成资源", "ComfyUI output");
  tabInput.classList.add("on");
  tabs.append(tabInput, tabOutput);

  const toolbar = el("div", "hl-lia-toolbar");
  const crumb = el("div", "hl-lia-crumb");
  const sizes = el("div", "hl-lia-sizes");
  toolbar.append(crumb, sizes);

  const foldList = el("div", "hl-lia-foldlist");
  const grid = el("div", "hl-lia-grid");
  bodyEl.append(tabs, toolbar, foldList, grid);

  const foot = el("div", "hl-lia-foot");
  const cancelBtn = button("", "取消");
  foot.append(cancelBtn);

  dialog.append(head, bodyEl, foot);
  overlay.append(dialog);
  document.body.append(overlay);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
  };
  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const commitPick = (pic, shownFolder) => {
    if (closed) return;
    close();
    onPick({ source, folder: shownFolder, name: pic.name });
  };

  function renderSizeButtons() {
    sizes.textContent = "";
    for (const size of THUMB_SIZES) {
      const b = button("", `${size}px`);
      if (size === thumbSize) b.classList.add("on");
      b.addEventListener("click", () => {
        thumbSize = size;
        renderSizeButtons();
        refresh();
      });
      sizes.append(b);
    }
  }

  function setSource(next) {
    source = next;
    folder = "";
    tabInput.classList.toggle("on", source === "input");
    tabOutput.classList.toggle("on", source === "output");
    refresh();
  }

  function renderCrumb() {
    crumb.textContent = "";
    const rootBtn = button("", source === "input" ? "input" : "output");
    rootBtn.addEventListener("click", () => {
      folder = "";
      refresh();
    });
    crumb.append(rootBtn);
    if (!folder) return;
    const parts = folder.split("/").filter(Boolean);
    let acc = "";
    parts.forEach((part) => {
      crumb.append(el("span", null, " / "));
      acc = acc ? `${acc}/${part}` : part;
      const seg = acc;
      const b = button("", part);
      b.addEventListener("click", () => {
        folder = seg;
        refresh();
      });
      crumb.append(b);
    });
  }

  async function refresh() {
    renderCrumb();
    foldList.textContent = "";
    grid.textContent = "";
    grid.style.setProperty("--hl-lia-cell", `${thumbSize}px`);
    try {
      const fParams = new URLSearchParams({ source, folder });
      const fData = await fetchJson(`/honorlee/media/folders?${fParams}`);
      for (const name of fData.folders || []) {
        const b = button("", name);
        b.addEventListener("click", () => {
          folder = folder ? `${folder}/${name}` : name;
          refresh();
        });
        foldList.append(b);
      }

      const lParams = new URLSearchParams({ source, folder, subfolders: "0" });
      const lData = await fetchJson(`/honorlee/media/list?${lParams}`);
      const shownFolder = lData.folder || "";

      for (const pic of lData.pictures || []) {
        const cell = el("div", "hl-lia-cell");
        cell.setAttribute("role", "button");
        cell.tabIndex = 0;
        cell.style.width = `${thumbSize}px`;
        cell.style.height = `${thumbSize}px`;
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.src = thumbUrl(source, shownFolder, pic.name, pic.v, thumbSize);
        const label = el("div", "hl-lia-label", basename(pic.name));
        const del = button("hl-lia-del", "×", "删除文件");
        del.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fileLabel = basename(pic.name);
          if (!confirm(`确定删除「${fileLabel}」？此操作不可恢复。`)) return;
          try {
            const params = new URLSearchParams({
              source,
              folder: shownFolder,
              name: pic.name,
            });
            await fetchJson(`/honorlee/media/delete?${params}`, { method: "DELETE" });
            refresh();
          } catch (err) {
            toast(String(err.message || err));
          }
        });
        cell.append(img, label, del);
        const pick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          commitPick(pic, shownFolder);
        };
        cell.addEventListener("pointerup", pick);
        cell.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") pick(e);
        });
        grid.append(cell);
      }

      if (!(fData.folders || []).length && !(lData.pictures || []).length) {
        grid.append(el("div", "hl-lia-empty", "此目录下没有子文件夹或图片"));
      }
    } catch (err) {
      toast(String(err.message || err));
    }
  }

  tabInput.addEventListener("click", () => setSource("input"));
  tabOutput.addEventListener("click", () => setSource("output"));
  renderSizeButtons();
  refresh();
}

function hookImageWidget(node) {
  const widget = node.widgets?.find((w) => w.name === "image");
  if (!widget) return;

  if (!node.__hlLiaHooked) {
    node.__hlLiaHooked = true;
    collapseNativeWidget(widget);

    const openPicker = () => {
      openImagePicker(({ source, folder, name }) => {
        applyImageSelection(node, widget, source, folder, name);
      });
    };

    suppressOfficialPreview(node);
    buildImagePanel(
      node,
      widget,
      openPicker,
      () => openMaskEditorForNode(node),
      () => clearImageSelection(node, widget),
    );

    if (!widget.__hlLiaOrigCallback) {
      widget.__hlLiaOrigCallback = widget.callback;
      widget.callback = function (value) {
        syncToolbar(node.__hlLiaToolbar, value ?? widget.value);
        const ret = widget.__hlLiaOrigCallback?.apply(this, arguments);
        queueMicrotask(() => {
          node.__hlLiaPreview?.refresh?.();
        });
        return ret;
      };
    }
  }

  syncImageWidgetState(node);
  markNodeHost(node);
  queueMicrotask(() => suppressOfficialPreview(node));
}

app.registerExtension({
  name: "HonorLee.LoadImageAdvance",
  setup() {
    ensureCss();
    queueMicrotask(() => {
      getMaskEditorApi();
    });
  },
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== NODE_CLASS) return;

    chainCallback(nodeType.prototype, "onNodeCreated", function () {
      queueMicrotask(() => hookImageWidget(this));
    });

    chainCallback(nodeType.prototype, "onAdded", function () {
      queueMicrotask(() => {
        hookImageWidget(this);
        markNodeHost(this);
      });
    });

    chainCallback(nodeType.prototype, "onSerialize", function (info) {
      const imageWidget = this.widgets?.find((w) => w.name === "image");
      persistImageStore(this, imageWidget?.value ?? "");
      if (!info || !Array.isArray(this.widgets)) return;
      try {
        info.widgets_values = widgetsToDict(this.widgets);
      } catch (_e) {
        /* keep base positional array */
      }
    });

    chainCallback(nodeType.prototype, "onConfigure", function (info) {
      const configureInfo = info ?? { widgets_values: this.widgets_values };
      restoreImageWidgetFromStore(this, configureInfo);
      queueMicrotask(() => {
        hookImageWidget(this);
        restoreImageWidgetFromStore(this, configureInfo);
        syncImageWidgetState(this);
      });
    });

    chainCallback(nodeType.prototype, "onResize", function (size) {
      if (size) size[0] = Math.max(240, size[0] || 0);
    });

    chainCallback(nodeType.prototype, "onRemoved", function () {
      delete this.__hlLiaPreview;
      delete this.__hlLiaToolbar;
    });
  },
});
