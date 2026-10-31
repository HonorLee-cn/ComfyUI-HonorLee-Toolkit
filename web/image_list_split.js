import { app } from "/scripts/app.js";

const NODE_CLASS = "HonorLeeImageListSplit";
const WIDGET_NAME = "output_count";
const MAX_OUTPUTS = 16;
const OUT_PREFIX = "image_";

function chainCallback(object, property, fn) {
  if (object == null) return;
  const old = object[property];
  object[property] = function (...args) {
    const ret = old?.apply(this, args);
    const cbRet = fn.apply(this, args);
    return cbRet !== undefined ? cbRet : ret;
  };
}

function outputName(index) {
  return `${OUT_PREFIX}${index}`;
}

function clampCount(value) {
  const n = Number.parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_OUTPUTS, n));
}

function getOutputCountWidget(node) {
  return node.widgets?.find((w) => w.name === WIDGET_NAME);
}

function readTargetCount(node) {
  const widget = getOutputCountWidget(node);
  return clampCount(widget?.value ?? 1);
}

function syncOutputs(node) {
  if (!node?.outputs) return;
  if (node.__hlImageListSplitSyncing) return;

  const target = readTargetCount(node);
  node.__hlImageListSplitSyncing = true;
  try {
    while (node.outputs.length > target) {
      node.removeOutput(node.outputs.length - 1);
    }
    while (node.outputs.length < target) {
      const next = node.outputs.length + 1;
      node.addOutput(outputName(next), "IMAGE");
    }
    for (let i = 0; i < node.outputs.length; i++) {
      node.outputs[i].name = outputName(i + 1);
    }
    node.setSize(node.computeSize());
  } finally {
    node.__hlImageListSplitSyncing = false;
  }
  app.canvas?.setDirty?.(true, true);
}

function hookOutputCountWidget(node) {
  const widget = getOutputCountWidget(node);
  if (!widget || widget.__hlImageListSplitHooked) return;
  widget.__hlImageListSplitHooked = true;
  chainCallback(widget, "callback", function () {
    syncOutputs(node);
  });
}

function scheduleSync(node) {
  queueMicrotask(() => {
    hookOutputCountWidget(node);
    syncOutputs(node);
  });
}

app.registerExtension({
  name: "HonorLee.ImageListSplit",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== NODE_CLASS) return;

    chainCallback(nodeType.prototype, "onNodeCreated", function () {
      scheduleSync(this);
    });

    chainCallback(nodeType.prototype, "onConfigure", function () {
      scheduleSync(this);
    });
  },
});
