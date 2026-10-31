import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const NODE_CLASS = "HonorLeePromptSelector";
const WIDGET_NAME = "hl_prompt_selector_panel";
const CSS_ID = "honorlee-prompt-library-css";
const NODE_WIDTH = 360;
const TEXT_MIN = 80;
const DOM_WRAPPER_INSET = 16;
const WIDGET_FRAME = 20;
const BAR_H = 32;
const LAYOUT_GAP = 8;
/** LiteGraph output row above the widget panel (Prompt socket). */
const OUTPUT_ROW = () => Math.max(20, globalThis.LiteGraph?.NODE_SLOT_HEIGHT ?? 20);
const DEFAULT_NODE_H = 280;

let libraryCache = null;
let libraryPromise = null;

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

function keepDomWidgetWidthAuto(widget) {
  if (!widget) return widget;
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
  return widget;
}

function ensureCss() {
  let style = document.getElementById(CSS_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = CSS_ID;
    document.head.append(style);
  }
  style.textContent = `
.hl-pl{box-sizing:border-box;width:100%;max-width:100%;min-width:0;height:100%;min-height:0;display:flex;flex-direction:column;gap:${LAYOUT_GAP}px;font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#d4d4d4;pointer-events:none}
.hl-pl *{box-sizing:border-box}
.hl-pl-bar{flex:0 0 auto;display:flex;gap:6px;width:100%;pointer-events:auto;height:${BAR_H}px;align-items:stretch}
.hl-pl-bar button{flex:1;min-width:0;padding:5px 6px;border:1px solid #444;border-radius:6px;background:#1e1e1e;color:#ccc;cursor:pointer;font:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hl-pl-bar button:hover{border-color:#6a9fb5;color:#fff}
.hl-pl-ta{pointer-events:auto;flex:1 1 auto;width:100%;min-height:${TEXT_MIN}px;height:0;resize:none;overflow:auto;padding:8px;border:1px solid #444;border-radius:6px;background:#141414;color:#eee;font:inherit;line-height:1.4}
.hl-pl-ta:focus{outline:none;border-color:#6a9fb5}
.hl-pl-overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px;pointer-events:auto}
.hl-pl-dialog{width:min(720px,96vw);max-height:min(88vh,900px);display:flex;flex-direction:column;border:1px solid #555;border-radius:10px;background:#1a1a1a;box-shadow:0 16px 48px rgba(0,0,0,.65);overflow:hidden}
.hl-pl-dialog.wide{width:min(920px,96vw)}
.hl-pl-dhead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #333}
.hl-pl-dhead h2{flex:1;margin:0;font:600 14px/1.3 inherit;color:#fff}
.hl-pl-dclose{flex:0 0 28px;width:28px;height:28px;border:1px solid #555;border-radius:6px;background:#252525;color:#ccc;cursor:pointer;font:700 14px/1 sans-serif}
.hl-pl-dbody{flex:1;min-height:0;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.hl-pl-dfoot{padding:10px 14px;border-top:1px solid #333;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.hl-pl-dfoot button,.hl-pl-primary{padding:6px 14px;border:1px solid #555;border-radius:6px;background:#252525;color:#ddd;cursor:pointer;font:inherit}
.hl-pl-dfoot button:hover{color:#fff;border-color:#6a9fb5}
.hl-pl-primary{border-color:#6a9fb5;background:#2a3a42;color:#fff}
.hl-pl-primary:hover{background:#3a5a68}
.hl-pl-primary:disabled,.hl-pl-dfoot button:disabled{opacity:.45;cursor:default}
.hl-pl-field{display:flex;flex-direction:column;gap:4px}
.hl-pl-field>span{font-size:11px;color:#999}
.hl-pl-field input,.hl-pl-field textarea{padding:6px 8px;border:1px solid #444;border-radius:6px;background:#141414;color:#eee;font:inherit}
.hl-pl-field textarea{min-height:140px;resize:vertical;line-height:1.4}
.hl-pl-cover-row{display:flex;align-items:center;gap:10px}
.hl-pl-cover-preview{width:72px;height:72px;border:1px solid #444;border-radius:8px;background:#111;display:grid;place-items:center;overflow:hidden;flex-shrink:0;color:#666;font-size:22px}
.hl-pl-cover-preview img{width:100%;height:100%;object-fit:cover;display:block}
.hl-pl-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hl-pl-tag{padding:3px 8px;border:1px solid #444;border-radius:999px;background:#222;color:#bbb;cursor:pointer;font:inherit;font-size:11px}
.hl-pl-tag.on{border-color:#6a9fb5;background:#2a3a42;color:#fff}
.hl-pl-tag-input{flex:1;min-width:120px;padding:4px 8px;border:1px dashed #555;border-radius:999px;background:transparent;color:#ddd;font:inherit}
.hl-pl-tagbar{display:flex;flex-wrap:wrap;gap:6px}
.hl-pl-list{display:flex;flex-direction:column;gap:6px;min-height:120px}
.hl-pl-item{display:flex;gap:10px;padding:8px;border:1px solid #333;border-radius:8px;background:#141414;cursor:pointer;align-items:flex-start}
.hl-pl-item:hover{border-color:#555}
.hl-pl-item.sel{border-color:#6a9fb5;background:#1e2a30}
.hl-pl-thumb{width:52px;height:52px;border-radius:6px;background:#0d0d0d;flex-shrink:0;overflow:hidden;display:grid;place-items:center;color:#666;font-size:18px}
.hl-pl-thumb img{width:100%;height:100%;object-fit:cover}
.hl-pl-item-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.hl-pl-item-name{font-weight:600;color:#eee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hl-pl-item-tags{display:flex;flex-wrap:wrap;gap:4px}
.hl-pl-item-tags span{font-size:10px;padding:2px 6px;border-radius:4px;background:#252525;color:#aaa}
.hl-pl-manage{display:flex;gap:10px;min-height:360px}
.hl-pl-side{width:96px;flex-shrink:0;display:flex;flex-direction:column;gap:4px;border-right:1px solid #333;padding-right:8px}
.hl-pl-side button{text-align:left;padding:6px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;font:inherit}
.hl-pl-side button:hover{color:#fff;background:#252525}
.hl-pl-side button.on{border-color:#6a9fb5;background:#2a3a42;color:#fff}
.hl-pl-grid{flex:1;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;min-width:0}
.hl-pl-card{position:relative;width:calc(50% - 4px);min-width:200px;display:flex;gap:8px;padding:8px;border:1px solid #333;border-radius:8px;background:#141414}
@media (max-width:640px){.hl-pl-card{width:100%}}
.hl-pl-card-over{position:absolute;inset:0;display:none;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,.55);border-radius:8px}
.hl-pl-card:hover .hl-pl-card-over{display:flex}
.hl-pl-card-over button{padding:5px 10px;border:1px solid #666;border-radius:6px;background:#2a2a2a;color:#fff;cursor:pointer;font:inherit}
.hl-pl-cover-dial .hl-pl-tabs{display:flex;gap:6px;margin-bottom:8px}
.hl-pl-cover-dial .hl-pl-tabs button{padding:5px 10px;border:1px solid #444;border-radius:6px;background:#222;color:#aaa;cursor:pointer;font:inherit}
.hl-pl-cover-dial .hl-pl-tabs button.on{border-color:#6a9fb5;color:#fff;background:#2a3a42}
.hl-pl-crumb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;color:#999;margin-bottom:6px}
.hl-pl-crumb button{border:none;background:none;color:#6a9fb5;cursor:pointer;font:inherit;padding:0}
.hl-pl-foldlist{display:flex;flex-direction:column;gap:2px;max-height:120px;overflow:auto;margin-bottom:8px}
.hl-pl-foldlist button{text-align:left;padding:4px 8px;border:none;border-radius:4px;background:#222;color:#ccc;cursor:pointer;font:inherit}
.hl-pl-foldlist button:hover{background:#333;color:#fff}
.hl-pl-imggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;max-height:280px;overflow:auto}
.hl-pl-imgcell{aspect-ratio:1;border:1px solid #333;border-radius:6px;overflow:hidden;cursor:pointer;background:#0d0d0d;padding:0}
.hl-pl-imgcell:hover{border-color:#6a9fb5}
.hl-pl-imgcell img{width:100%;height:100%;object-fit:cover;display:block}
.hl-pl-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10060;padding:8px 14px;border-radius:8px;background:#2a2020;border:1px solid #844;color:#faa;font:12px/1.3 sans-serif;pointer-events:none}
.hl-pl-toast.ok{border-color:#486;background:#1a2a22;color:#bde}
`;
}

function toast(msg, ok = false) {
  ensureCss();
  const node = el("div", `hl-pl-toast${ok ? " ok" : ""}`, msg);
  document.body.append(node);
  setTimeout(() => node.remove(), 2800);
}

async function fetchJson(path, options) {
  const resp = await api.fetchApi(path, options);
  let data = null;
  try {
    data = await resp.json();
  } catch (_e) {
    data = null;
  }
  if (!resp.ok) {
    const err = data?.error || resp.statusText || "request failed";
    throw new Error(err);
  }
  return data;
}

function invalidateLibrary() {
  libraryCache = null;
  libraryPromise = null;
}

async function loadLibrary(force = false) {
  if (!force && libraryCache) return libraryCache;
  if (!force && libraryPromise) return libraryPromise;
  libraryPromise = fetchJson("/honorlee/prompt_library").then((data) => {
    libraryCache = data;
    return data;
  });
  return libraryPromise;
}

function coverThumbUrl(cover, size = 160) {
  if (!cover?.name) return null;
  const params = new URLSearchParams({
    source: cover.source || "input",
    folder: cover.folder || "",
    name: cover.name,
    size: String(size),
    t: String(Math.floor((cover.v || 0) * 1000) || Date.now() % 1e7),
  });
  return `/honorlee/media/thumb?${params}`;
}

function fillThumb(container, cover, fallbackChar) {
  container.textContent = "";
  if (cover?.name) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = coverThumbUrl(cover);
    img.onerror = () => {
      container.textContent = fallbackChar || "?";
    };
    container.append(img);
  } else {
    container.textContent = fallbackChar || "·";
  }
}

function closeOverlay(root) {
  root?.remove();
}

function openDialog({ title, body, footer, wide = false, onClose }) {
  ensureCss();
  const overlay = el("div", "hl-pl-overlay");
  const dialog = el("div", wide ? "hl-pl-dialog wide" : "hl-pl-dialog");
  const head = el("div", "hl-pl-dhead");
  const h2 = el("h2", null, title);
  const closeBtn = button("hl-pl-dclose", "×", "关闭");
  head.append(h2, closeBtn);
  const bodyEl = el("div", "hl-pl-dbody");
  if (typeof body === "function") body(bodyEl);
  else if (body instanceof Node) bodyEl.append(body);
  const foot = el("div", "hl-pl-dfoot");
  if (footer) footer(foot, () => closeOverlay(overlay));
  dialog.append(head, bodyEl, foot);
  overlay.append(dialog);
  document.body.append(overlay);
  const done = () => {
    onClose?.();
    closeOverlay(overlay);
  };
  closeBtn.addEventListener("click", done);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) done();
  });
  return { overlay, bodyEl, foot, close: done };
}

function openCoverPicker(onPick) {
  let source = "input";
  let folder = "";
  const dialogRef = openDialog({
    title: "选择封面",
    wide: true,
    body: (bodyEl) => {
      bodyEl.classList.add("hl-pl-cover-dial");
      const tabs = el("div", "hl-pl-tabs");
      const tabInput = button("", "上传资源", "ComfyUI input");
      const tabOutput = button("", "生成资源", "ComfyUI output");
      tabInput.classList.add("on");
      tabs.append(tabInput, tabOutput);
      const crumb = el("div", "hl-pl-crumb");
      const foldList = el("div", "hl-pl-foldlist");
      const grid = el("div", "hl-pl-imggrid");
      bodyEl.append(tabs, crumb, foldList, grid);

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
        parts.forEach((part, index) => {
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
          for (const pic of lData.pictures || []) {
            const cell = el("button", "hl-pl-imgcell");
            const img = document.createElement("img");
            const cover = { source, folder: lData.folder || "", name: pic.name, v: pic.v };
            img.src = coverThumbUrl(cover, 120);
            cell.append(img);
            cell.addEventListener("click", () => {
              onPick({ source, folder: lData.folder || "", name: pic.name });
              dialogRef.close();
            });
            grid.append(cell);
          }
          if (!(fData.folders || []).length && !(lData.pictures || []).length) {
            grid.append(el("div", null, "此目录下没有子文件夹或图片"));
          }
        } catch (err) {
          toast(String(err.message || err));
        }
      }

      tabInput.addEventListener("click", () => setSource("input"));
      tabOutput.addEventListener("click", () => setSource("output"));
      refresh();
    },
    footer: (foot, close) => {
      const cancel = button("", "取消");
      cancel.addEventListener("click", close);
      foot.append(cancel);
    },
  });
}

function openSaveDialog({ item, initialContent, allTags, onSaved }) {
  const editing = item?.id ? item : null;
  let cover = editing?.cover ? { ...editing.cover } : null;
  const selectedTags = new Set(editing?.tags || []);

  openDialog({
    title: editing ? "编辑提示词" : "保存提示词",
    body: (bodyEl) => {
      const nameField = el("div", "hl-pl-field");
      nameField.append(el("span", null, "提示词名字"));
      const nameInput = el("input");
      nameInput.value = editing?.name || "";
      nameField.append(nameInput);

      const coverField = el("div", "hl-pl-field");
      coverField.append(el("span", null, "提示词封面"));
      const coverRow = el("div", "hl-pl-cover-row");
      const preview = el("div", "hl-pl-cover-preview");
      const pickCover = button("", "选择封面", "从 input/output 选择");
      const clearCover = button("", "清除", "不使用封面");
      coverRow.append(preview, pickCover, clearCover);
      coverField.append(coverRow);

      function refreshCover() {
        fillThumb(preview, cover, (nameInput.value || "?").slice(0, 1));
      }
      refreshCover();

      pickCover.addEventListener("click", () => {
        openCoverPicker((picked) => {
          cover = picked;
          refreshCover();
        });
      });
      clearCover.addEventListener("click", () => {
        cover = null;
        refreshCover();
      });

      const tagField = el("div", "hl-pl-field");
      tagField.append(el("span", null, "提示词标签"));
      const tagWrap = el("div", "hl-pl-tags");
      const tagInput = el("input", "hl-pl-tag-input");
      tagInput.placeholder = "输入新标签后回车";
      tagField.append(tagWrap);

      function renderTags() {
        tagWrap.textContent = "";
        const tags = [...(allTags || []), ...selectedTags];
        const uniq = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        );
        for (const tag of uniq) {
          const chip = button("hl-pl-tag" + (selectedTags.has(tag) ? " on" : ""), tag);
          chip.addEventListener("click", () => {
            if (selectedTags.has(tag)) selectedTags.delete(tag);
            else selectedTags.add(tag);
            renderTags();
          });
          tagWrap.append(chip);
        }
        tagWrap.append(tagInput);
      }
      renderTags();

      tagInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const t = tagInput.value.trim();
        if (!t) return;
        selectedTags.add(t);
        if (!allTags.includes(t)) allTags.push(t);
        tagInput.value = "";
        renderTags();
      });

      const textField = el("div", "hl-pl-field");
      textField.append(el("span", null, "提示词内容"));
      const contentTa = el("textarea");
      contentTa.value = editing?.content ?? initialContent ?? "";
      textField.append(contentTa);

      bodyEl.append(nameField, coverField, tagField, textField);

      bodyEl.__hlSave = async () => {
        const payload = {
          id: editing?.id,
          name: nameInput.value.trim(),
          content: contentTa.value,
          tags: [...selectedTags],
          cover,
        };
        const data = await fetchJson("/honorlee/prompt_library/item", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        invalidateLibrary();
        onSaved?.(data.item);
        toast("已保存", true);
      };
    },
    footer: (foot, close) => {
      const cancel = button("", "取消");
      cancel.addEventListener("click", close);
      const save = button("hl-pl-primary", "保存");
      save.addEventListener("click", async () => {
        try {
          await foot.closest(".hl-pl-dialog")?.querySelector(".hl-pl-dbody")?.__hlSave?.();
          close();
        } catch (err) {
          toast(String(err.message || err));
        }
      });
      foot.append(cancel, save);
    },
  });
}

function buildListItem(prompt, selectedId, onSelect) {
  const row = el("div", "hl-pl-item" + (selectedId === prompt.id ? " sel" : ""));
  const thumb = el("div", "hl-pl-thumb");
  fillThumb(thumb, prompt.cover, prompt.name?.slice(0, 1) || "?");
  const main = el("div", "hl-pl-item-main");
  main.append(el("div", "hl-pl-item-name", prompt.name || "(未命名)"));
  const tags = el("div", "hl-pl-item-tags");
  for (const tag of prompt.tags || []) tags.append(el("span", null, tag));
  main.append(tags);
  row.append(thumb, main);
  row.addEventListener("click", () => onSelect(prompt.id));
  return row;
}

function openPickDialog(getNodeText, setNodeText) {
  let filterTag = "";
  let selectedId = null;
  let overwriteBtn = null;
  let appendBtn = null;

  const syncPickActions = () => {
    const on = Boolean(selectedId);
    if (overwriteBtn) overwriteBtn.disabled = !on;
    if (appendBtn) appendBtn.disabled = !on;
  };

  openDialog({
    title: "选择提示词",
    wide: true,
    body: (bodyEl) => {
      const tagBar = el("div", "hl-pl-tagbar");
      const list = el("div", "hl-pl-list");
      bodyEl.append(tagBar, list);

      async function render() {
        tagBar.textContent = "";
        list.textContent = "加载中…";
        try {
          const data = await loadLibrary();
          const tags = data.tags || [];
          const allBtn = button("hl-pl-tag" + (!filterTag ? " on" : ""), "全部");
          allBtn.addEventListener("click", () => {
            filterTag = "";
            render();
          });
          tagBar.append(allBtn);
          for (const tag of tags) {
            const b = button("hl-pl-tag" + (filterTag === tag ? " on" : ""), tag);
            b.addEventListener("click", () => {
              filterTag = tag;
              render();
            });
            tagBar.append(b);
          }
          let prompts = data.prompts || [];
          if (filterTag) prompts = prompts.filter((p) => (p.tags || []).includes(filterTag));
          list.textContent = "";
          if (!prompts.length) {
            list.append(el("div", null, "暂无提示词"));
            selectedId = null;
            return;
          }
          for (const p of prompts) {
            list.append(
              buildListItem(p, selectedId, (id) => {
                selectedId = id;
                syncPickActions();
                render();
              }),
            );
          }
          syncPickActions();
        } catch (err) {
          list.textContent = "";
          list.append(el("div", null, String(err.message || err)));
        }
      }
      render();
      bodyEl.__hlSelected = () => selectedId;
      bodyEl.__hlContent = async () => {
        const data = await loadLibrary();
        const found = (data.prompts || []).find((p) => p.id === selectedId);
        return found?.content ?? "";
      };
    },
    footer: (foot, close) => {
      const overwrite = button("hl-pl-primary", "覆盖写入");
      const append = button("hl-pl-primary", "追加写入");
      overwriteBtn = overwrite;
      appendBtn = append;
      overwrite.disabled = true;
      append.disabled = true;

      overwrite.addEventListener("click", async () => {
        const body = foot.closest(".hl-pl-dialog")?.querySelector(".hl-pl-dbody");
        const content = await body?.__hlContent?.();
        if (content == null) return;
        setNodeText(content);
        close();
      });
      append.addEventListener("click", async () => {
        const body = foot.closest(".hl-pl-dialog")?.querySelector(".hl-pl-dbody");
        const content = await body?.__hlContent?.();
        if (content == null) return;
        const cur = getNodeText();
        setNodeText(cur ? `${cur}\n${content}` : content);
        close();
      });
      foot.append(overwrite, append);
    },
  });
}

function openManageDialog(onEdit) {
  let filterTag = "";

  openDialog({
    title: "提示词管理",
    wide: true,
    body: (bodyEl) => {
      const layout = el("div", "hl-pl-manage");
      const side = el("div", "hl-pl-side");
      const grid = el("div", "hl-pl-grid");
      layout.append(side, grid);
      bodyEl.append(layout);

      async function render() {
        side.textContent = "";
        grid.textContent = "加载中…";
        try {
          const data = await loadLibrary(true);
          const tags = data.tags || [];
          const allBtn = button(filterTag ? "" : "on", "全部");
          allBtn.addEventListener("click", () => {
            filterTag = "";
            render();
          });
          side.append(allBtn);
          for (const tag of tags) {
            const b = button(filterTag === tag ? "on" : "", tag);
            b.addEventListener("click", () => {
              filterTag = tag;
              render();
            });
            side.append(b);
          }
          let prompts = data.prompts || [];
          if (filterTag) prompts = prompts.filter((p) => (p.tags || []).includes(filterTag));
          grid.textContent = "";
          if (!prompts.length) {
            grid.append(el("div", null, "暂无提示词"));
            return;
          }
          for (const p of prompts) {
            const card = el("div", "hl-pl-card");
            const thumb = el("div", "hl-pl-thumb");
            fillThumb(thumb, p.cover, p.name?.slice(0, 1) || "?");
            const main = el("div", "hl-pl-item-main");
            main.append(el("div", "hl-pl-item-name", p.name || "(未命名)"));
            const tagRow = el("div", "hl-pl-item-tags");
            for (const tag of p.tags || []) tagRow.append(el("span", null, tag));
            main.append(tagRow);
            const over = el("div", "hl-pl-card-over");
            const editBtn = button("", "编辑");
            const delBtn = button("", "删除");
            over.append(editBtn, delBtn);
            card.append(thumb, main, over);
            editBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              onEdit(p, () => render());
            });
            delBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              if (!confirm(`确认删除「${p.name}」？`)) return;
              try {
                await fetchJson(`/honorlee/prompt_library/item?id=${encodeURIComponent(p.id)}`, {
                  method: "DELETE",
                });
                invalidateLibrary();
                toast("已删除", true);
                render();
              } catch (err) {
                toast(String(err.message || err));
              }
            });
            grid.append(card);
          }
        } catch (err) {
          grid.textContent = "";
          grid.append(el("div", null, String(err.message || err)));
        }
      }
      render();
      bodyEl.__hlRefresh = render;
    },
    footer: (foot, close) => {
      const done = button("", "关闭");
      done.addEventListener("click", close);
      foot.append(done);
    },
  });
}

function hidePromptWidget(node) {
  const widget = node.widgets?.find((w) => w.name === "prompt");
  if (!widget) return null;
  widget.type = "converted-widget";
  widget.computeSize = () => [0, -4];
  if (widget.element) widget.element.style.display = "none";
  const origSerialize = widget.serializeValue?.bind(widget);
  widget.serializeValue = function () {
    if (node.__hlPromptText != null) return node.__hlPromptText;
    return origSerialize ? origSerialize() : widget.value;
  };
  return widget;
}

function panelMinHeight() {
  return BAR_H + LAYOUT_GAP + TEXT_MIN;
}

function holdPanelMinHeight(root, layoutHeight) {
  if (!root?.style) return;
  const host = root.closest?.("[data-node-id]");
  const inner = Math.max(TEXT_MIN, layoutHeight - WIDGET_FRAME);
  root.style.minHeight = host ? `${Math.round(inner)}px` : "";
}

function attachFillLayout(node, root, widget) {
  const minH = () => panelMinHeight();
  delete widget.computeSize;
  widget.computeLayoutSize = () => {
    const h = minH();
    holdPanelMinHeight(root, h);
    return { minWidth: NODE_WIDTH, minHeight: h };
  };
  widget.options ??= {};
  widget.options.minNodeSize = [NODE_WIDTH, minH() + 60];
  holdPanelMinHeight(root, minH());
  if (typeof ResizeObserver === "function" && !root.__hlPlObs) {
    root.__hlPlObs = new ResizeObserver(() => holdPanelMinHeight(root, minH()));
    root.__hlPlObs.observe(root);
  }
}

function buildPanel(node) {
  if (node.__hlPromptPanel) return node.__hlPromptPanel;

  ensureCss();
  const promptWidget = hidePromptWidget(node);
  if (promptWidget) {
    const prevQueued = promptWidget.beforeQueued;
    promptWidget.beforeQueued = function (...args) {
      node.__hlPromptPanel?.syncToWidget?.();
      return prevQueued?.apply(this, args);
    };
  }
  const root = el("div", "hl-pl");
  const bar = el("div", "hl-pl-bar");
  const btnPick = button("", "选择提示词");
  const btnSave = button("", "保存当前提示词");
  const btnManage = button("", "提示词管理");
  bar.append(btnPick, btnSave, btnManage);
  const ta = el("textarea", "hl-pl-ta");
  ta.spellcheck = false;
  root.append(bar, ta);

  const syncFromWidget = () => {
    const v = promptWidget?.value ?? "";
    if (ta.value !== v) ta.value = v;
    node.__hlPromptText = ta.value;
  };
  const syncToWidget = () => {
    node.__hlPromptText = ta.value;
    if (promptWidget) promptWidget.value = ta.value;
  };

  syncFromWidget();
  ta.addEventListener("input", () => {
    syncToWidget();
  });

  const state = {
    root,
    ta,
    promptWidget,
    widget: null,
    syncFromWidget,
    syncToWidget,
  };
  node.__hlPromptPanel = state;

  btnPick.addEventListener("click", () => {
    openPickDialog(
      () => ta.value,
      (text) => {
        ta.value = text;
        syncToWidget();
      },
    );
  });

  btnSave.addEventListener("click", async () => {
    try {
      const data = await loadLibrary();
      openSaveDialog({
        initialContent: ta.value,
        allTags: [...(data.tags || [])],
        onSaved: () => {},
      });
    } catch (err) {
      toast(String(err.message || err));
    }
  });

  btnManage.addEventListener("click", () => {
    openManageDialog((item, refreshManage) => {
      loadLibrary(true).then((data) => {
        openSaveDialog({
          item,
          allTags: [...(data.tags || [])],
          onSaved: () => refreshManage?.(),
        });
      });
    });
  });

  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,textarea,input")) e.stopPropagation();
  });

  const widget = node.addDOMWidget(WIDGET_NAME, WIDGET_NAME, root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => panelMinHeight(),
  });
  keepDomWidgetWidthAuto(widget);
  widget.serialize = false;
  attachFillLayout(node, root, widget);
  state.widget = widget;

  node.widgets_start_y = OUTPUT_ROW();
  node.setSize?.([
    Math.max(node.size?.[0] || 0, NODE_WIDTH),
    Math.max(node.size?.[1] || 0, DEFAULT_NODE_H),
  ]);
  return state;
}

app.registerExtension({
  name: "HonorLee.PromptSelector",
  setup() {
    ensureCss();
  },
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== NODE_CLASS) return;

    chainCallback(nodeType.prototype, "onNodeCreated", function () {
      const state = buildPanel(this);
      queueMicrotask(() => state.syncFromWidget());
    });

    chainCallback(nodeType.prototype, "onConfigure", function () {
      const state = buildPanel(this);
      queueMicrotask(() => state.syncFromWidget());
    });

    chainCallback(nodeType.prototype, "onResize", function (size) {
      const state = this.__hlPromptPanel;
      if (state?.root) {
        state.root.style.height = "100%";
        holdPanelMinHeight(state.root, panelMinHeight());
      }
      this.widgets_start_y = OUTPUT_ROW();
      if (size) size[0] = Math.max(NODE_WIDTH, size[0] || 0);
      app.graph?.setDirtyCanvas?.(true, false);
    });

    chainCallback(nodeType.prototype, "onRemoved", function () {
      const state = this.__hlPromptPanel;
      state?.root?.__hlPlObs?.disconnect();
      delete this.__hlPromptPanel;
      delete this.__hlPromptText;
    });
  },
});
