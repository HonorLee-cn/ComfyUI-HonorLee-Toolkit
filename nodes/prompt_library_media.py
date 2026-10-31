"""Safe input/output image browsing for prompt library cover picker."""

from __future__ import annotations

import os
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

SOURCES = ("input", "output")
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff")
MAX_PICTURES = 5000
OUTSIDE = "Path must stay inside ComfyUI input or output folder."

try:
    import folder_paths
except ImportError:
    folder_paths = None


def clean_folder(folder) -> str:
    text = str(folder or "").strip().replace("\\", "/")
    if text.startswith("/") or text.startswith("~") or re.match(r"^[A-Za-z]:", text):
        raise ValueError(OUTSIDE)
    parts = [part for part in text.split("/") if part not in ("", ".")]
    if any(part == ".." for part in parts):
        raise ValueError(OUTSIDE)
    return "/".join(parts)


def root_path(source: str) -> Path:
    if source not in SOURCES:
        raise ValueError(f"source must be one of {SOURCES}")
    if folder_paths is None:
        raise RuntimeError("ComfyUI folder_paths unavailable")
    getter = folder_paths.get_output_directory if source == "output" else folder_paths.get_input_directory
    return Path(getter()).resolve()


def safe_folder(root: Path, folder: str, source: str = "input") -> Path:
    relative = clean_folder(folder)
    top = root.resolve()
    target = top.joinpath(*relative.split("/")).resolve() if relative else top
    if target != top and top not in target.parents:
        raise ValueError(OUTSIDE)
    if not target.is_dir():
        raise ValueError(f'No folder "{relative}" in {source}')
    return target


def natural_key(name: str):
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", str(name))]


def list_folders(root: Path, folder: str, source: str = "input") -> list[str]:
    base = safe_folder(root, folder, source)
    names = []
    for entry in base.iterdir():
        if entry.name.startswith(".") or entry.is_symlink() or not entry.is_dir():
            continue
        names.append(entry.name)
    return sorted(names, key=natural_key)


def list_pictures(
    root: Path,
    folder: str,
    subfolders: bool = False,
    source: str = "input",
    limit: int = MAX_PICTURES,
) -> list[dict]:
    base = safe_folder(root, folder, source)
    top = root.resolve()
    found: list[dict] = []
    if subfolders:
        walker = os.walk(base, followlinks=False)
    else:
        walker = [(str(base), [], sorted(os.listdir(base)))]
    for directory, dirnames, files in walker:
        dirnames[:] = sorted(name for name in dirnames if not name.startswith("."))
        for name in files:
            if name.startswith(".") or not name.lower().endswith(IMAGE_EXTENSIONS):
                continue
            path = Path(directory) / name
            try:
                real = path.resolve()
                if top not in real.parents or not real.is_file():
                    continue
                stat = real.stat()
            except OSError:
                continue
            found.append({
                "name": path.relative_to(base).as_posix(),
                "mtime": float(stat.st_mtime),
            })
            if len(found) >= limit:
                break
        if len(found) >= limit:
            break
    found.sort(key=lambda item: natural_key(item["name"]))
    return found


def resolve_image(root: Path, folder: str, name: str) -> Path:
    base = clean_folder(folder)
    relative = clean_folder(f"{base}/{name}" if base else name)
    top = root.resolve()
    path = top.joinpath(*relative.split("/")).resolve()
    if top not in path.parents or not path.is_file():
        raise ValueError("no such picture")
    if not path.name.lower().endswith(IMAGE_EXTENSIONS):
        raise ValueError("not an image")
    return path


def thumbnail_bytes(path: Path, edge: int = 160) -> bytes:
    edge = max(48, min(512, int(edge)))
    with Image.open(path) as source:
        frame = ImageOps.exif_transpose(source)
        if frame.mode in ("RGBA", "LA") or (frame.mode == "P" and "transparency" in frame.info):
            rgba = frame.convert("RGBA")
            rgba.thumbnail((edge, edge), Image.Resampling.LANCZOS)
            small = Image.new("RGB", rgba.size, (30, 30, 30))
            small.paste(rgba, (0, 0), rgba)
        else:
            small = frame.convert("RGB")
            small.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        buf = BytesIO()
        small.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
