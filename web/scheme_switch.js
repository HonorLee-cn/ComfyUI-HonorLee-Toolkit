import { app } from "/scripts/app.js";

const NODE_CLASS = "WorkflowSchemeSwitch";
const PROPERTY_KEY = "workflow_scheme_switch";
const LEGACY_PROPERTY_KEY = "hl_scheme_switch";
const CSS_ID = "workflow-scheme-switch-css";
const WIDGET_NAME = "workflow_scheme_switch";

const MODE_ALWAYS = 0;
const MODE_NEVER = 2;
const MODE_BYPASS = 4;

const SCHEMES_MAX = 20;
const MEMBERS_MAX = 100;
const GROUP_NODE_STATES_MAX = 400;
const TITLE_MAX = 60;
const RECHECK_MS = 150;
const NODE_WIDTH = 340;
const WIDGETS_TOP = 2;
/** ComfyUI DOM widget wrapper vertical margin/inset (see widget_card WRAPPER_INSET). */
const DOM_WRAPPER_INSET = 16;
const HEIGHT_PAD = 4;

const STATES = ["normal", "bypass", "mute"];

const live = new Set();
let hookedCanvas = null;

/** Keep DOM widget wrapper width tied to the node (ComfyUI plants a stale widget.width). */
function keepDomWidgetWidthAuto(widget) {
  if (!widget) return widget;
  try {
    Object.defineProperty(widget, "width", {
      get() {
        return undefined;
      },
      set(_value) {
        /* ignore planted layout width */
      },
      configurable: true,
    });
  } catch (_error) {
    /* frozen widget */
  }
  return widget;
}

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
.hl-ss{box-sizing:border-box;width:100%;max-width:100%;min-width:0;height:auto;flex:0 0 auto;overflow:hidden;display:flex;flex-direction:column;gap:8px;font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#d4d4d4;pointer-events:none}
.hl-ss *{box-sizing:border-box}
.hl-ss-bar{display:flex;align-items:stretch;gap:6px;width:100%;min-width:0;flex-wrap:nowrap;pointer-events:auto}
.hl-ss-tabs{display:flex;flex:1;min-width:0;gap:4px;align-items:stretch}
.hl-ss-tab{flex:1;min-width:0;padding:4px 8px;border:1px solid #444;border-radius:6px;background:#1e1e1e;color:#aaa;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:inherit;text-align:center}
.hl-ss-tab.active{border-color:#6a9fb5;background:#2a3a42;color:#fff}
.hl-ss-tab .hl-ss-tab-x{margin-left:4px;color:#888;font-weight:700;flex-shrink:0}
.hl-ss-tab .hl-ss-tab-x:hover{color:#f88}
.hl-ss-tab-add{flex:0 0 28px;width:28px;padding:0;border:1px dashed #555;border-radius:6px;background:transparent;color:#888;cursor:pointer;font:700 14px/1 sans-serif}
.hl-ss-tab-add:hover{border-color:#6a9fb5;color:#fff}
.hl-ss-modebar{display:flex;flex:0 0 28px;width:28px;min-width:28px;pointer-events:auto}
.hl-ss-modebar .hl-ss-done-btn{display:none}
.hl-ss.edit .hl-ss-modebar .hl-ss-edit-btn{display:none}
.hl-ss.edit .hl-ss-modebar .hl-ss-done-btn{display:grid}
.hl-ss-iconbtn{width:28px;height:28px;padding:0;border:1px solid #555;border-radius:6px;background:#2a2a2a;color:#ccc;cursor:pointer;display:grid;place-items:center;flex-shrink:0}
.hl-ss-iconbtn:hover{border-color:#6a9fb5;color:#fff}
.hl-ss-iconbtn.done{border-color:#6a9fb5;background:#3a5a68;color:#fff}
.hl-ss-iconbtn svg{display:block}
.hl-ss-list{display:flex;flex-direction:column;gap:0;width:100%;min-width:0;pointer-events:auto}
.hl-ss-row{display:flex;align-items:center;gap:6px;width:100%;min-width:0;padding:2px 0;border-bottom:1px dashed #484848}
.hl-ss-row:last-child{border-bottom:none}
.hl-ss-del{display:none;flex:0 0 22px;width:22px;height:22px;padding:0;border:1px solid #553;border-radius:4px;background:#2a2020;color:#c88;font:700 12px/1 sans-serif;cursor:pointer}
.hl-ss.edit .hl-ss-del{display:block}
.hl-ss-kind{flex:0 0 16px;width:16px;height:16px;display:grid;place-items:center;flex-shrink:0}
.hl-ss-kind-node{color:#8ab4c7}
.hl-ss-kind-group{color:#9ab88a}
.hl-ss-row.missing .hl-ss-kind{opacity:.5}
.hl-ss-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ddd;user-select:none}
.hl-ss-row.missing .hl-ss-name{color:#866;font-style:italic}
.hl-ss-unified{display:none;align-items:center;flex-shrink:0;cursor:pointer;user-select:none}
.hl-ss.edit .hl-ss-row.group .hl-ss-unified{display:flex}
.hl-ss-unified input{margin:0;cursor:pointer}
.hl-ss-unified span{font-size:10px;color:#888;max-width:72px;line-height:1.2}
.hl-ss-row-actions{display:flex;flex:0 0 auto;align-items:center;gap:6px;margin-left:auto}
.hl-ss-triple{display:inline-flex;flex-shrink:0;border:1px solid #444;border-radius:6px;overflow:hidden}
.hl-ss-triple button{padding:3px 6px;border:none;background:#252525;color:#888;font:600 10px/1.2 sans-serif;cursor:pointer;min-width:44px}
.hl-ss-triple button:hover{background:#333;color:#fff}
.hl-ss-triple button.on{background:#3a5a68;color:#fff}
.hl-ss-triple.mixed button.on{background:repeating-linear-gradient(135deg,#3a5a68 0 3px,#252525 3px 6px);color:#bde}
.hl-ss-focus{flex-shrink:0;width:28px;height:26px;padding:0;border:1px solid #444;border-radius:6px;background:#252525;color:#aaa;cursor:pointer;display:grid;place-items:center}
.hl-ss-focus:hover{border-color:#6a9fb5;color:#fff}
.hl-ss-addrow{display:none;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;width:100%;min-width:0;pointer-events:auto}
.hl-ss.edit .hl-ss-addrow{display:grid}
.hl-ss-pick{min-height:32px;padding:6px 10px;border:1px dashed #555;border-radius:6px;color:#777;font:inherit;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none;min-width:0}
.hl-ss-pick.ready{border-color:#6a9fb588;color:#ccc}
.hl-ss-add{padding:0 16px;border:1px solid #6a9fb5;border-radius:6px;background:#3a5a68;color:#fff;font:inherit;font-weight:700;cursor:pointer;flex-shrink:0}
.hl-ss-add:disabled{opacity:.4;cursor:default}
.hl-ss-empty{color:#666;font-size:11px;padding:8px 0;text-align:center;user-select:none;width:100%}
`;
}

function cleanTitle(title) {
  return String(title ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_MAX);
}

function cleanId(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^(0|[1-9]\d{0,14})$/.test(raw.trim())) return Number(raw.trim());
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function normalizeState(raw) {
  const s = String(raw ?? "").toLowerCase();
  return STATES.includes(s) ? s : "normal";
}

function normalizeGroupMode(raw) {
  return String(raw ?? "").toLowerCase() === "individual" ? "individual" : "unified";
}

function cleanNodeStatesMap(raw, limit = GROUP_NODE_STATES_MAX) {
  const map = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return map;
  let count = 0;
  for (const [nid, val] of Object.entries(raw)) {
    const id = cleanId(nid);
    if (id === null) continue;
    map[String(id)] = normalizeState(val);
    count += 1;
    if (count >= limit) break;
  }
  return map;
}

function cleanNodeStates(raw) {
  const nodeStates = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return nodeStates;
  for (const [schemeKey, map] of Object.entries(raw)) {
    const cleaned = cleanNodeStatesMap(map);
    if (Object.keys(cleaned).length) nodeStates[String(schemeKey)] = cleaned;
  }
  return nodeStates;
}

function isGroupIndividual(member) {
  return member?.kind === "group" && member.groupMode === "individual";
}

function snapshotTargetsNodeStates(targets) {
  const map = {};
  for (const n of targets) map[String(n.id)] = modeToState(n.mode);
  return map;
}

function ensureGroupPresetState(member, schemeKey, targets) {
  const key = String(schemeKey);
  if (member.states[key] !== undefined) return;
  const { state: agg, mixed } = readAggregateState(targets);
  member.states[key] = mixed ? "normal" : agg;
}

function promoteGroupSnapshot(member, targets, schemeKey) {
  const key = String(schemeKey);
  ensureGroupPresetState(member, key, targets);
  member.groupMode = "individual";
  member.nodeStates ??= {};
  member.nodeStates[key] = snapshotTargetsNodeStates(targets);
}

function nodeStatesSig(member, schemeKey) {
  if (!isGroupIndividual(member)) return "";
  const map = member.nodeStates?.[schemeKey];
  if (!map) return "";
  return Object.keys(map)
    .sort()
    .map((nid) => `${nid}=${map[nid]}`)
    .join(",");
}

function defaultData() {
  return {
    editMode: true,
    activeSchemeId: 1,
    schemes: [{ id: 1, name: "Scheme 1" }],
    members: [],
  };
}

function normalizeData(raw) {
  const base = defaultData();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const schemes = [];
  const usedScheme = new Set();
  for (const item of Array.isArray(raw.schemes) ? raw.schemes : []) {
    if (!item || typeof item !== "object") continue;
    let id = Number(item.id);
    if (!Number.isInteger(id) || id < 1 || usedScheme.has(id)) {
      id = 1;
      while (usedScheme.has(id)) id += 1;
    }
    usedScheme.add(id);
    schemes.push({
      id,
      name: cleanTitle(item.name) || `Scheme ${id}`,
    });
    if (schemes.length >= SCHEMES_MAX) break;
  }
  if (!schemes.length) schemes.push({ id: 1, name: "Scheme 1" });

  const members = [];
  const usedMember = new Set();
  for (const item of Array.isArray(raw.members) ? raw.members : []) {
    if (!item || typeof item !== "object") continue;
    const kind = item.kind === "group" ? "group" : "node";
    const targetId = cleanId(item.targetId);
    if (targetId === null) continue;
    let id = Number(item.id);
    if (!Number.isInteger(id) || id < 1 || usedMember.has(id)) {
      id = 1;
      while (usedMember.has(id)) id += 1;
    }
    usedMember.add(id);
    const states = {};
    if (item.states && typeof item.states === "object") {
      for (const [key, val] of Object.entries(item.states)) {
        states[String(key)] = normalizeState(val);
      }
    }
    const entry = {
      id,
      kind,
      targetId,
      title: cleanTitle(item.title) || (kind === "group" ? "Group" : "Node"),
      states,
    };
    if (kind === "group") {
      entry.groupMode = normalizeGroupMode(item.groupMode);
      entry.nodeStates = cleanNodeStates(item.nodeStates);
    }
    members.push(entry);
    if (members.length >= MEMBERS_MAX) break;
  }

  let activeSchemeId = Number(raw.activeSchemeId);
  if (!schemes.some((s) => s.id === activeSchemeId)) activeSchemeId = schemes[0].id;

  return {
    editMode: Boolean(raw.editMode),
    activeSchemeId,
    schemes,
    members,
  };
}

function getData(node) {
  node.properties ??= {};
  let stored = node.properties[PROPERTY_KEY];
  if (!stored && node.properties[LEGACY_PROPERTY_KEY]) {
    stored = node.properties[LEGACY_PROPERTY_KEY];
    delete node.properties[LEGACY_PROPERTY_KEY];
  }
  const data = normalizeData(stored);
  node.properties[PROPERTY_KEY] = data;
  return data;
}

function saveData(node, data) {
  node.properties[PROPERTY_KEY] = data;
}

function modeToState(mode) {
  if (mode === MODE_NEVER) return "mute";
  if (mode === MODE_BYPASS) return "bypass";
  return "normal";
}

function stateToMode(state) {
  if (state === "mute") return MODE_NEVER;
  if (state === "bypass") return MODE_BYPASS;
  return MODE_ALWAYS;
}

function isSchemeNode(node) {
  const t = node?.comfyClass || node?.type;
  return t === NODE_CLASS;
}

function nodeTitle(node) {
  return cleanTitle(node?.title || node?.constructor?.title || node?.type || "Node");
}

function groupTitle(group) {
  return cleanTitle(group?.title || "Group");
}

function groupBounds(group) {
  for (const rect of [group?.boundingRect, group?._bounding]) {
    if (rect && rect.length >= 4) return [rect[0], rect[1], rect[2], rect[3]];
  }
  const pos = group?.pos ?? [0, 0];
  const size = group?.size ?? [0, 0];
  return [pos[0], pos[1], size[0], size[1]];
}

function nodeCenter(node) {
  const pos = node?.pos ?? [0, 0];
  const size = node?.size ?? [0, 0];
  return [pos[0] + size[0] / 2, pos[1] + size[1] / 2];
}

function pointInRect(x, y, rect) {
  const [rx, ry, rw, rh] = rect;
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function getGraphNodes(graph) {
  return graph?.nodes ?? graph?._nodes ?? [];
}

function getGraphGroups(graph) {
  return graph?.groups ?? graph?._groups ?? [];
}

function findNodeById(graph, id) {
  return getGraphNodes(graph).find((n) => n.id === id || String(n.id) === String(id));
}

function findGroupById(graph, id) {
  return getGraphGroups(graph).find((g) => g.id === id || String(g.id) === String(id));
}

function nodesInGroup(graph, group) {
  if (!group) return [];
  const rect = groupBounds(group);
  const nodes = [];
  for (const node of getGraphNodes(graph)) {
    if (!node || isSchemeNode(node)) continue;
    const [cx, cy] = nodeCenter(node);
    if (pointInRect(cx, cy, rect)) nodes.push(node);
  }
  return nodes;
}

function resolveTargetNodes(graph, member) {
  if (!member) return [];
  if (member.kind === "group") {
    const group = findGroupById(graph, member.targetId);
    return nodesInGroup(graph, group);
  }
  const node = findNodeById(graph, member.targetId);
  return node && !isSchemeNode(node) ? [node] : [];
}

function readAggregateState(nodes) {
  if (!nodes.length) return { state: "normal", mixed: false };
  const modes = nodes.map((n) => modeToState(n.mode));
  const first = modes[0];
  const same = modes.every((m) => m === first);
  return { state: same ? first : modes[0], mixed: !same };
}

function memberDisplayTitle(graph, member) {
  if (member.kind === "group") {
    const group = findGroupById(graph, member.targetId);
    return group ? groupTitle(group) : `${member.title} (missing)`;
  }
  const node = findNodeById(graph, member.targetId);
  return node ? nodeTitle(node) : `${member.title} (missing)`;
}

function memberExists(graph, member) {
  if (member.kind === "group") return Boolean(findGroupById(graph, member.targetId));
  return Boolean(findNodeById(graph, member.targetId));
}

function markGraphDirty(graph) {
  if (typeof graph?.change === "function") graph.change();
  else graph?.setDirtyCanvas?.(true, true);
}

function applyModesToNodes(nodes, state) {
  const mode = stateToMode(state);
  for (const node of nodes) node.mode = mode;
}

function applyMemberScheme(graph, member, schemeId) {
  const targets = resolveTargetNodes(graph, member);
  if (!targets.length) return;
  const key = String(schemeId);
  if (isGroupIndividual(member)) {
    member.nodeStates ??= {};
    let map = member.nodeStates[key];
    if (!map || typeof map !== "object") {
      map = {};
      member.nodeStates[key] = map;
    }
    for (const n of targets) {
      const nid = String(n.id);
      const st = map[nid] !== undefined
        ? normalizeState(map[nid])
        : normalizeState(modeToState(n.mode));
      if (map[nid] === undefined) map[nid] = st;
      n.mode = stateToMode(st);
    }
    return;
  }
  applyModesToNodes(targets, normalizeState(member.states[key]));
}

function applyScheme(state) {
  const { node, applying } = state;
  const graph = node.graph;
  if (!graph) return;
  const data = getData(node);
  applying.current = true;
  try {
    for (const member of data.members) {
      applyMemberScheme(graph, member, data.activeSchemeId);
    }
    markGraphDirty(graph);
    saveData(node, data);
  } finally {
    applying.current = false;
  }
}

function writeGroupIndividualUniform(member, schemeKey, targets, st) {
  member.nodeStates ??= {};
  const map = {};
  for (const n of targets) map[String(n.id)] = st;
  member.nodeStates[schemeKey] = map;
}

function setMemberState(state, memberId, newState) {
  const { node } = state;
  const graph = node.graph;
  const data = getData(node);
  const member = data.members.find((m) => m.id === memberId);
  if (!member) return;
  const st = normalizeState(newState);
  const schemeKey = String(data.activeSchemeId);
  member.states[schemeKey] = st;
  const targets = resolveTargetNodes(graph, member);
  if (targets.length) {
    state.applying.current = true;
    try {
      if (isGroupIndividual(member)) {
        writeGroupIndividualUniform(member, schemeKey, targets, st);
      }
      applyModesToNodes(targets, st);
      markGraphDirty(graph);
    } finally {
      state.applying.current = false;
    }
  }
  saveData(node, data);
  refresh(state);
}

function setGroupUnified(state, member, unified) {
  if (member.kind !== "group") return;
  const graph = state.node.graph;
  const data = getData(state.node);
  const schemeKey = String(data.activeSchemeId);
  const targets = resolveTargetNodes(graph, member);
  if (unified) {
    if (
      isGroupIndividual(member)
      && member.nodeStates
      && Object.values(member.nodeStates).some((m) => m && Object.keys(m).length)
    ) {
      if (!confirm(
        "Switch to unified mode? Per-node mode differences will be replaced when you use the group switches.",
      )) return;
    }
    member.groupMode = "unified";
    delete member.nodeStates;
    if (targets.length) {
      const { state: agg, mixed } = readAggregateState(targets);
      member.states[schemeKey] = mixed
        ? normalizeState(member.states[schemeKey] ?? "normal")
        : agg;
    }
  } else {
    member.groupMode = "individual";
    member.nodeStates ??= {};
    if (targets.length) {
      ensureGroupPresetState(member, schemeKey, targets);
      member.nodeStates[schemeKey] = snapshotTargetsNodeStates(targets);
    }
  }
  saveData(state.node, data);
  refresh(state);
}

function syncFromGraph(state) {
  if (state.applying.current) return false;
  const { node } = state;
  const graph = node.graph;
  if (!graph) return false;
  const data = getData(node);
  let changed = false;
  const schemeKey = String(data.activeSchemeId);
  for (const member of data.members) {
    const targets = resolveTargetNodes(graph, member);
    if (!targets.length) continue;
    const { state: agg, mixed } = readAggregateState(targets);

    if (isGroupIndividual(member)) {
      ensureGroupPresetState(member, schemeKey, targets);
      member.nodeStates ??= {};
      let map = member.nodeStates[schemeKey];
      if (!map || typeof map !== "object") {
        map = {};
        member.nodeStates[schemeKey] = map;
      }
      for (const n of targets) {
        const nid = String(n.id);
        const live = modeToState(n.mode);
        if (normalizeState(map[nid]) !== live) {
          map[nid] = live;
          changed = true;
        }
      }
      continue;
    }

    if (member.kind === "group" && mixed) {
      promoteGroupSnapshot(member, targets, schemeKey);
      changed = true;
      continue;
    }

    if (mixed) continue;
    const saved = normalizeState(member.states[schemeKey]);
    if (saved !== agg) {
      member.states[schemeKey] = agg;
      changed = true;
    }
  }
  if (changed) saveData(node, data);
  return changed;
}

function switchScheme(state, schemeId) {
  const data = getData(state.node);
  if (!data.schemes.some((s) => s.id === schemeId)) return;
  data.activeSchemeId = schemeId;
  saveData(state.node, data);
  applyScheme(state);
  refresh(state);
}

function setEditMode(state, edit) {
  const data = getData(state.node);
  data.editMode = Boolean(edit);
  saveData(state.node, data);
  state.declaredHeight = 0;
  state.lastSig = "";
  refresh(state);
}

function nextSchemeId(schemes) {
  let id = 1;
  const used = new Set(schemes.map((s) => s.id));
  while (used.has(id)) id += 1;
  return id;
}

function addScheme(state) {
  const data = getData(state.node);
  if (data.schemes.length >= SCHEMES_MAX) return;
  const id = nextSchemeId(data.schemes);
  const prevActive = data.activeSchemeId;
  data.schemes.push({ id, name: `Scheme ${id}` });
  data.activeSchemeId = id;
  for (const member of data.members) {
    const prevKey = String(prevActive);
    const newKey = String(id);
    member.states[newKey] = normalizeState(member.states[prevKey] ?? "normal");
    if (member.nodeStates?.[prevKey]) {
      member.nodeStates[newKey] = { ...member.nodeStates[prevKey] };
    }
  }
  saveData(state.node, data);
  applyScheme(state);
  refresh(state);
}

function removeScheme(state, schemeId) {
  const data = getData(state.node);
  if (data.schemes.length <= 1) return;
  const idx = data.schemes.findIndex((s) => s.id === schemeId);
  if (idx < 0) return;
  data.schemes.splice(idx, 1);
  const key = String(schemeId);
  for (const member of data.members) {
    delete member.states[key];
    if (member.nodeStates) delete member.nodeStates[key];
  }
  if (data.activeSchemeId === schemeId) data.activeSchemeId = data.schemes[0].id;
  saveData(state.node, data);
  applyScheme(state);
  refresh(state);
}

function renameScheme(state, schemeId, name) {
  const data = getData(state.node);
  const scheme = data.schemes.find((s) => s.id === schemeId);
  if (!scheme) return;
  scheme.name = cleanTitle(name) || scheme.name;
  saveData(state.node, data);
  refresh(state);
}

function removeMember(state, memberId) {
  const data = getData(state.node);
  data.members = data.members.filter((m) => m.id !== memberId);
  saveData(state.node, data);
  refresh(state);
}

function memberKey(kind, targetId) {
  return `${kind}:${String(targetId)}`;
}

function addMember(state, kind, target, title) {
  const { node } = state;
  const graph = node.graph;
  const data = getData(node);
  if (data.members.length >= MEMBERS_MAX) return;
  const targetId = target.id;
  const key = memberKey(kind, targetId);
  if (data.members.some((m) => memberKey(m.kind, m.targetId) === key)) return;

  let nodes;
  if (kind === "group") nodes = nodesInGroup(graph, target);
  else nodes = [target];

  const { state: agg, mixed } = readAggregateState(nodes.filter(Boolean));
  const initial = mixed ? "normal" : agg;

  let id = 1;
  const used = new Set(data.members.map((m) => m.id));
  while (used.has(id)) id += 1;

  const member = {
    id,
    kind,
    targetId,
    title: cleanTitle(title),
    states: {},
  };
  if (kind === "group") {
    member.groupMode = "unified";
    member.nodeStates = {};
  }
  for (const scheme of data.schemes) {
    member.states[String(scheme.id)] =
      scheme.id === data.activeSchemeId ? initial : "normal";
  }
  data.members.push(member);
  saveData(node, data);
  refresh(state);
}

function pickedSelection(state) {
  const canvas = app.canvas;
  const graph = state.node.graph;
  const items = canvas?.selectedItems
    ? [...canvas.selectedItems]
    : Object.values(canvas?.selected_nodes ?? {});
  const nodes = [];
  const groups = [];
  for (const item of items) {
    if (!item || (item.graph && graph && item.graph !== graph)) continue;
    const Group = globalThis.LiteGraph?.LGraphGroup;
    const Node = globalThis.LiteGraph?.LGraphNode;
    if (Group && item instanceof Group) {
      if (Number.isInteger(item.id) && item.id >= 0) groups.push(item);
    } else if (Node && item instanceof Node && item !== state.node && !isSchemeNode(item)) {
      nodes.push(item);
    }
  }
  return { nodes, groups };
}

function pickLabel(pick) {
  const parts = [];
  for (const n of pick.nodes) parts.push(nodeTitle(n));
  for (const g of pick.groups) parts.push(groupTitle(g));
  if (!parts.length) return "Select a node or group on the canvas";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, 3).join(", ") + (parts.length > 3 ? ` (+${parts.length - 3})` : "");
}

function addFromSelection(state) {
  const pick = pickedSelection(state);
  if (!pick.nodes.length && !pick.groups.length) return;
  for (const n of pick.nodes) addMember(state, "node", n, nodeTitle(n));
  for (const g of pick.groups) addMember(state, "group", g, groupTitle(g));
}

function frameMember(state, member) {
  const graph = state.node.graph;
  if (!graph) return;
  const canvas = app.canvas;
  let rect = null;
  if (member.kind === "group") {
    const group = findGroupById(graph, member.targetId);
    if (group) rect = groupBounds(group);
  } else {
    const node = findNodeById(graph, member.targetId);
    if (node) {
      const pos = node.pos ?? [0, 0];
      const size = node.size ?? [100, 50];
      rect = [pos[0], pos[1], size[0], size[1]];
    }
  }
  if (!rect) return;
  if (member.kind === "node") {
    const target = findNodeById(graph, member.targetId);
    if (target && typeof canvas?.centerOnNode === "function") {
      canvas.centerOnNode(target);
      return;
    }
  }
  if (typeof canvas?.animateToBounds === "function") {
    canvas.animateToBounds(rect, { zoom: 0.8 });
  } else if (typeof canvas?.ds?.fitToBounds === "function") {
    canvas.ds.fitToBounds(rect, { zoom: 0.8 });
    canvas.setDirty?.(true, true);
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

function focusIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      d: "M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.6",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
  }]);
}

function editIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      d: "M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linejoin": "round",
    },
  }]);
}

function doneIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "path",
    attrs: {
      d: "M3 8.5l3.5 3.5L13 4",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
  }]);
}

function nodeKindIcon() {
  return svgIcon("0 0 16 16", [
    {
      tag: "rect",
      attrs: {
        x: "3",
        y: "4",
        width: "10",
        height: "9",
        rx: "2",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.4",
      },
    },
    {
      tag: "path",
      attrs: {
        d: "M3 7h10",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.2",
      },
    },
  ], 12);
}

function groupKindIcon() {
  return svgIcon("0 0 16 16", [{
    tag: "rect",
    attrs: {
      x: "2.5",
      y: "3.5",
      width: "11",
      height: "10",
      rx: "1.5",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.4",
      "stroke-dasharray": "2.5 2",
    },
  }], 12);
}

function memberKindIcon(member) {
  const isGroup = member.kind === "group";
  const wrap = el("span", `hl-ss-kind hl-ss-kind-${isGroup ? "group" : "node"}`);
  wrap.title = isGroup ? "Group" : "Node";
  wrap.append(isGroup ? groupKindIcon() : nodeKindIcon());
  return wrap;
}

function buildTriple(memberId, current, mixed) {
  const wrap = el("div", `hl-ss-triple${mixed ? " mixed" : ""}`);
  for (const st of STATES) {
    const label = st.charAt(0).toUpperCase() + st.slice(1);
    const btn = button("", label);
    if (st === current) btn.classList.add("on");
    btn.dataset.state = st;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = wrap.closest(".hl-ss")?.__hlState;
      if (panel) setMemberState(panel, memberId, st);
    });
    wrap.append(btn);
  }
  return wrap;
}

function renderTabs(state, data, graph) {
  state.tabsEl.replaceChildren();
  for (const scheme of data.schemes) {
    const tab = button(
      `hl-ss-tab${scheme.id === data.activeSchemeId ? " active" : ""}`,
      scheme.name,
    );
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("hl-ss-tab-x")) return;
      switchScheme(state, scheme.id);
    });
    if (data.editMode) {
      tab.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const next = prompt("Scheme name", scheme.name);
        if (next != null) renameScheme(state, scheme.id, next);
      });
      const x = el("span", "hl-ss-tab-x", "×");
      x.title = "Remove scheme";
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        if (data.schemes.length <= 1) return;
        if (confirm(`Remove "${scheme.name}"?`)) removeScheme(state, scheme.id);
      });
      tab.append(document.createTextNode(" "), x);
    }
    state.tabsEl.append(tab);
  }
  if (data.editMode && data.schemes.length < SCHEMES_MAX) {
    const addTab = button("hl-ss-tab-add", "+", "Add scheme");
    addTab.addEventListener("click", () => addScheme(state));
    state.tabsEl.append(addTab);
  }
}

function renderList(state, data, graph) {
  state.listEl.replaceChildren();
  if (!data.members.length) {
    state.listEl.append(el("div", "hl-ss-empty", "No nodes or groups in this list"));
    return;
  }
  for (const member of data.members) {
    const row = el("div", "hl-ss-row");
    if (member.kind === "group") row.classList.add("group");
    const exists = memberExists(graph, member);
    if (!exists) row.classList.add("missing");

    if (data.editMode) {
      const del = button("hl-ss-del", "×", "Remove from list");
      del.addEventListener("click", () => removeMember(state, member.id));
      row.append(del);
    }

    row.append(memberKindIcon(member));

    const title = memberDisplayTitle(graph, member);
    const snapshot = cleanTitle(title.replace(/ \(missing\)$/, "")) || member.title;
    if (snapshot !== member.title) {
      member.title = snapshot;
      saveData(state.node, data);
    }
    row.append(el("div", "hl-ss-name", title));

    if (member.kind === "group") {
      const unifyLabel = el("label", "hl-ss-unified", "");
      unifyLabel.title = "Apply same mode to all members";
      const unifyCb = document.createElement("input");
      unifyCb.type = "checkbox";
      unifyCb.checked = !isGroupIndividual(member);
      unifyCb.addEventListener("click", (e) => e.stopPropagation());
      unifyCb.addEventListener("change", () => {
        setGroupUnified(state, member, unifyCb.checked);
      });
      unifyLabel.append(unifyCb, el("span", "", "Same"));
      row.append(unifyLabel);
    }

    const targets = resolveTargetNodes(graph, member);
    const schemeKey = String(data.activeSchemeId);
    if (member.kind === "group") ensureGroupPresetState(member, schemeKey, targets);
    const saved = normalizeState(member.states[schemeKey] ?? "normal");
    const { mixed } = readAggregateState(targets);
    const displayState = saved;
    const actions = el("div", "hl-ss-row-actions");
    actions.append(buildTriple(member.id, displayState, targets.length ? mixed : false));
    const focus = button("hl-ss-focus", "", "Focus on canvas");
    focus.append(focusIcon());
    focus.addEventListener("click", () => frameMember(state, member));
    actions.append(focus);
    row.append(actions);

    state.listEl.append(row);
  }
}

function renderAddRow(state, data) {
  if (!data.editMode) {
    state.addRow.hidden = true;
    if (state.addRow.parentElement) state.addRow.remove();
    return;
  }
  if (!state.addRow.parentElement) state.root.append(state.addRow);
  state.addRow.hidden = false;
  const pick = pickedSelection(state);
  const ready = pick.nodes.length + pick.groups.length > 0;
  state.pickEl.textContent = pickLabel(pick);
  state.pickEl.classList.toggle("ready", ready);
  state.addBtn.disabled = !ready;
}

function signature(state, data, graph) {
  const pick = data.editMode ? pickedSelection(state) : { nodes: [], groups: [] };
  const pickSig = pick.nodes.map((n) => n.id).join(",") + "|" + pick.groups.map((g) => g.id).join(",");
  const schemeKey = String(data.activeSchemeId);
  const memberSig = data.members
    .map((m) => {
      const t = resolveTargetNodes(graph, m);
      const agg = readAggregateState(t);
      const label = memberDisplayTitle(graph, m);
      const gm = m.kind === "group" ? (m.groupMode ?? "unified") : "-";
      const ns = nodeStatesSig(m, schemeKey);
      return `${m.id}:${m.kind}:${m.targetId}:${label}:${gm}:${ns}:${m.states[schemeKey]}:${agg.mixed}:${t.map((n) => modeToState(n.mode)).join(",")}`;
    })
    .join(";");
  return [
    data.editMode,
    data.activeSchemeId,
    data.schemes.map((s) => `${s.id}:${s.name}`).join(","),
    memberSig,
    pickSig,
  ].join("|");
}

function refresh(state) {
  if (state.disposed) return;
  const graph = state.node.graph;
  const data = getData(state.node);
  const sig = signature(state, data, graph);
  if (sig === state.lastSig) return;
  state.lastSig = sig;

  state.root.classList.toggle("edit", data.editMode);

  renderTabs(state, data, graph);
  renderList(state, data, graph);
  renderAddRow(state, data);

  updateDeclaredHeight(state);
  syncNodeHeight(state);
  requestAnimationFrame(() => {
    if (state.disposed) return;
    updateDeclaredHeight(state);
    syncNodeHeight(state);
  });
}

function scheduleCheck(state) {
  if (state.disposed || state.timer != null) return;
  const shown = app.canvas?.getCurrentGraph?.() ?? app.canvas?.graph;
  if (state.node.graph && shown && state.node.graph !== shown) return;
  const wait = Math.max(0, state.checkedAt + RECHECK_MS - performance.now());
  state.timer = setTimeout(() => {
    state.timer = null;
    state.checkedAt = performance.now();
    if (syncFromGraph(state)) state.lastSig = "";
    refresh(state);
  }, wait);
}

function ensureRedrawHook() {
  const canvas = app.canvas;
  if (!canvas || canvas === hookedCanvas) return;
  hookedCanvas = canvas;
  chainCallback(canvas, "onDrawForeground", () => {
    for (const state of live) scheduleCheck(state);
  });
}

function panelHeightEstimate(state) {
  const data = getData(state.node);
  const bar = 30;
  const gap = 8;
  const row = 30;
  const addRow = 34;
  let h = bar + gap;
  h += data.members.length ? data.members.length * row : 24;
  if (data.editMode) h += gap + addRow;
  return h + DOM_WRAPPER_INSET + HEIGHT_PAD;
}

function measurePanelHeight(state) {
  const root = state.root;
  if (!root?.isConnected) return 0;
  const gap = 8;
  const blocks = [];
  for (const child of root.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (!child.isConnected || child.offsetParent === null) continue;
    const h = child.offsetHeight;
    if (h > 0) blocks.push(h);
  }
  if (!blocks.length) return 0;
  let total = blocks.reduce((sum, h) => sum + h, 0);
  total += gap * (blocks.length - 1);
  return Math.ceil(total) + DOM_WRAPPER_INSET + HEIGHT_PAD;
}

function updateDeclaredHeight(state) {
  const measured = measurePanelHeight(state);
  const estimate = panelHeightEstimate(state);
  state.declaredHeight = measured > 0 ? Math.max(measured, estimate) : estimate;
}

function widgetHeight(state) {
  if (state.declaredHeight > 0) return state.declaredHeight;
  return panelHeightEstimate(state);
}

function syncNodeHeight(state) {
  const height = widgetHeight(state);
  if (Math.abs((state.node.size?.[1] ?? 0) - height) > 1) {
    state.node.setSize?.([state.node.size[0], height]);
    state.node.setDirtyCanvas?.(true, false);
  }
}

function buildPanel(node) {
  if (node.__hlSchemeSwitch) return node.__hlSchemeSwitch;

  ensureCss();
  const root = el("div", "hl-ss");
  root.__hlState = null;

  const bar = el("div", "hl-ss-bar");
  const tabsEl = el("div", "hl-ss-tabs");
  const modebar = el("div", "hl-ss-modebar");
  const editBtn = button("hl-ss-iconbtn hl-ss-edit-btn", "", "Edit schemes and member list");
  editBtn.append(editIcon());
  const doneBtn = button("hl-ss-iconbtn hl-ss-done-btn done", "", "Done editing");
  doneBtn.append(doneIcon());
  modebar.append(editBtn, doneBtn);
  bar.append(tabsEl, modebar);

  const listEl = el("div", "hl-ss-list");
  const addRow = el("div", "hl-ss-addrow");
  const pickEl = el("div", "hl-ss-pick", "Select a node or group on the canvas");
  const addBtn = button("hl-ss-add", "ADD", "Add selection to list");
  addRow.append(pickEl, addBtn);

  root.append(bar, listEl, addRow);

  const state = {
    node,
    root,
    tabsEl,
    listEl,
    addRow,
    pickEl,
    addBtn,
    editBtn,
    doneBtn,
    widget: null,
    declaredHeight: 0,
    applying: { current: false },
    lastSig: "",
    checkedAt: 0,
    timer: null,
    disposed: false,
  };
  root.__hlState = state;
  node.__hlSchemeSwitch = state;

  editBtn.addEventListener("click", () => setEditMode(state, true));
  doneBtn.addEventListener("click", () => setEditMode(state, false));
  addBtn.addEventListener("click", () => addFromSelection(state));

  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,input")) e.stopPropagation();
  });
  root.addEventListener("dblclick", (e) => e.stopPropagation());

  const widget = node.addDOMWidget(WIDGET_NAME, WIDGET_NAME, root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => widgetHeight(state),
  });
  keepDomWidgetWidthAuto(widget);
  widget.serialize = false;
  widget.computeSize = (width) => [
    Number(width || node.size?.[0] || NODE_WIDTH),
    widgetHeight(state),
  ];
  widget.options ??= {};
  widget.options.minNodeSize = [NODE_WIDTH, 60];
  state.widget = widget;

  node.widgets_start_y = WIDGETS_TOP;
  live.add(state);
  ensureRedrawHook();
  return state;
}

function disposePanel(node) {
  const state = node.__hlSchemeSwitch;
  if (!state) return;
  state.disposed = true;
  if (state.timer != null) clearTimeout(state.timer);
  live.delete(state);
}

app.registerExtension({
  name: "Workflow.SchemeSwitch",
  setup() {
    ensureRedrawHook();
  },
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== NODE_CLASS) return;
    nodeType.prototype.isVirtualNode = true;

    chainCallback(nodeType.prototype, "onNodeCreated", function () {
      this.isVirtualNode = true;
      this.properties ??= {};
      if (!this.properties[PROPERTY_KEY]) {
        this.properties[PROPERTY_KEY] = defaultData();
      } else {
        this.properties[PROPERTY_KEY] = normalizeData(this.properties[PROPERTY_KEY]);
      }
      buildPanel(this);
      this.setSize?.([Math.max(this.size?.[0] || 0, NODE_WIDTH), this.size?.[1] || 0]);
    });

    chainCallback(nodeType.prototype, "onAdded", function () {
      const state = buildPanel(this);
      state.disposed = false;
      state.lastSig = "";
      live.add(state);
      queueMicrotask(() => {
        applyScheme(state);
        refresh(state);
      });
    });

    chainCallback(nodeType.prototype, "onConfigure", function () {
      const state = buildPanel(this);
      this.properties[PROPERTY_KEY] = normalizeData(this.properties[PROPERTY_KEY]);
      state.lastSig = "";
      queueMicrotask(() => {
        applyScheme(state);
        refresh(state);
      });
    });

    chainCallback(nodeType.prototype, "getExtraMenuOptions", function (_canvas, options) {
      if (!Array.isArray(options)) return;
      const data = getData(this);
      options.unshift({
        content: data.editMode ? "Done editing" : "Edit schemes",
        callback: () => {
          const state = buildPanel(this);
          setEditMode(state, !data.editMode);
        },
      }, null);
    });

    chainCallback(nodeType.prototype, "onRemoved", function () {
      disposePanel(this);
    });
  },
});
