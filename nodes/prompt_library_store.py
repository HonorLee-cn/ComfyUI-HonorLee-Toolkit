"""Global prompt library persisted under the ComfyUI user directory."""

from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path
from typing import Any

try:
    import folder_paths
except ImportError:
    folder_paths = None

_LOCK = threading.Lock()
_VERSION = 1


def _library_path() -> Path:
    if folder_paths is None:
        raise RuntimeError("ComfyUI folder_paths unavailable")
    base = Path(folder_paths.get_user_directory()) / "honorlee"
    base.mkdir(parents=True, exist_ok=True)
    return base / "prompt_library.json"


def _empty() -> dict[str, Any]:
    return {"version": _VERSION, "prompts": []}


def _normalize_tags(tags) -> list[str]:
    if not tags:
        return []
    if not isinstance(tags, list):
        raise ValueError("tags must be a list")
    out: list[str] = []
    seen: set[str] = set()
    for item in tags:
        text = str(item).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def _normalize_cover(cover) -> dict[str, str] | None:
    if cover is None:
        return None
    if not isinstance(cover, dict):
        raise ValueError("cover must be an object")
    source = str(cover.get("source", "")).strip()
    if source not in ("input", "output"):
        raise ValueError("cover.source must be input or output")
    folder = str(cover.get("folder", "")).strip().replace("\\", "/")
    name = str(cover.get("name", "")).strip().replace("\\", "/")
    if not name:
        raise ValueError("cover.name is required when cover is set")
    return {"source": source, "folder": folder, "name": name}


def _collect_tags(prompts: list[dict]) -> list[str]:
    seen: set[str] = set()
    tags: list[str] = []
    for item in prompts:
        for tag in item.get("tags") or []:
            if tag not in seen:
                seen.add(tag)
                tags.append(tag)
    return sorted(tags, key=lambda t: t.casefold())


def load_raw() -> dict[str, Any]:
    path = _library_path()
    if not path.is_file():
        return _empty()
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        return _empty()
    prompts = data.get("prompts")
    if not isinstance(prompts, list):
        prompts = []
    return {"version": int(data.get("version", _VERSION)), "prompts": prompts}


def save_raw(data: dict[str, Any]) -> None:
    path = _library_path()
    payload = {"version": _VERSION, "prompts": data.get("prompts") or []}
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    tmp.replace(path)


def list_library(tag_filter: str | None = None) -> dict[str, Any]:
    with _LOCK:
        data = load_raw()
    prompts = [dict(item) for item in data.get("prompts", []) if isinstance(item, dict)]
    tag = str(tag_filter or "").strip()
    if tag:
        prompts = [p for p in prompts if tag in (p.get("tags") or [])]
    prompts.sort(key=lambda p: (-int(p.get("updated_at") or 0), str(p.get("name", "")).casefold()))
    return {"tags": _collect_tags(data.get("prompts") or []), "prompts": prompts}


def upsert_item(body: dict[str, Any]) -> dict[str, Any]:
    name = str(body.get("name", "")).strip()
    if not name:
        raise ValueError("name is required")
    content = body.get("content")
    if content is None:
        content = ""
    if not isinstance(content, str):
        raise ValueError("content must be a string")
    tags = _normalize_tags(body.get("tags"))
    cover = _normalize_cover(body.get("cover"))
    item_id = str(body.get("id", "")).strip()
    now = int(time.time())

    with _LOCK:
        data = load_raw()
        prompts: list[dict] = [p for p in data.get("prompts", []) if isinstance(p, dict)]
        if item_id:
            for index, existing in enumerate(prompts):
                if str(existing.get("id")) == item_id:
                    prompts[index] = {
                        "id": item_id,
                        "name": name,
                        "content": content,
                        "tags": tags,
                        "cover": cover,
                        "updated_at": now,
                    }
                    data["prompts"] = prompts
                    save_raw(data)
                    return prompts[index]
            raise ValueError("prompt not found")
        new_item = {
            "id": str(uuid.uuid4()),
            "name": name,
            "content": content,
            "tags": tags,
            "cover": cover,
            "updated_at": now,
        }
        prompts.append(new_item)
        data["prompts"] = prompts
        save_raw(data)
        return new_item


def delete_item(item_id: str) -> bool:
    item_id = str(item_id or "").strip()
    if not item_id:
        raise ValueError("id is required")
    with _LOCK:
        data = load_raw()
        prompts = [p for p in data.get("prompts", []) if isinstance(p, dict)]
        kept = [p for p in prompts if str(p.get("id")) != item_id]
        if len(kept) == len(prompts):
            return False
        data["prompts"] = kept
        save_raw(data)
        return True
