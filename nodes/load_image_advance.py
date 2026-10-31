"""Load Image Advance — LoadImage with enhanced input/output image picker UI."""

from __future__ import annotations

import os

import folder_paths
from nodes import LoadImage

from . import prompt_library_routes  # noqa: F401 — register HTTP routes


class HonorLeeLoadImageAdvance(LoadImage):
    CATEGORY = "HonorLee/image"
    SEARCH_ALIASES = [
        "load image advance",
        "advanced load image",
        "加载图像",
        "load image",
        "image picker",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        input_dir = folder_paths.get_input_directory()
        files = [
            f
            for f in os.listdir(input_dir)
            if os.path.isfile(os.path.join(input_dir, f))
        ]
        files = folder_paths.filter_files_content_types(files, ["image"])
        return {
            "required": {
                "image": (sorted(files), {"image_upload": True}),
            }
        }


NODE_CLASS_MAPPINGS = {
    "HonorLeeLoadImageAdvance": HonorLeeLoadImageAdvance,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HonorLeeLoadImageAdvance": "Load Image Advance (加载图像)",
}
