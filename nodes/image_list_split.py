from __future__ import annotations

import torch

from comfy_api.latest import io

MAX_OUTPUTS = 16


def _as_scalar_int(value) -> int:
    if isinstance(value, list):
        if not value:
            return 1
        return int(value[0])
    return int(value)


def _append_tensor(flat: list[torch.Tensor], tensor: torch.Tensor) -> None:
    if not isinstance(tensor, torch.Tensor):
        return
    if tensor.ndim != 4:
        flat.append(tensor)
        return
    if tensor.shape[0] > 1:
        for i in range(tensor.shape[0]):
            flat.append(tensor[i : i + 1])
    else:
        flat.append(tensor)


def _flatten_images(images) -> list[torch.Tensor]:
    flat: list[torch.Tensor] = []
    if images is None:
        return flat
    if isinstance(images, torch.Tensor):
        _append_tensor(flat, images)
        return flat
    if not isinstance(images, list):
        return flat
    for item in images:
        if item is None:
            continue
        if isinstance(item, torch.Tensor):
            _append_tensor(flat, item)
        elif isinstance(item, list):
            flat.extend(_flatten_images(item))
    return flat


class HonorLeeImageListSplit(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        outputs = [
            io.Image.Output(id=f"image_{i}", display_name=f"image_{i}")
            for i in range(1, MAX_OUTPUTS + 1)
        ]
        return io.Schema(
            node_id="HonorLeeImageListSplit",
            display_name="Image List Split（图像列表拆分）",
            category="HonorLee/image",
            description=(
                "Split an image list (e.g. from Create List) or a batched IMAGE into "
                "separate IMAGE outputs. Set output_count to show that many output sockets; "
                "lowering output_count removes extra sockets and their links. "
                "If images is disconnected or empty, outputs within output_count are None."
            ),
            search_aliases=[
                "split image list",
                "image list",
                "unpack images",
                "图像列表",
                "拆分图像",
            ],
            is_input_list=True,
            inputs=[
                io.AnyType.Input("images", optional=True),
                io.Int.Input("output_count", default=1, min=1, max=MAX_OUTPUTS),
            ],
            outputs=outputs,
        )

    @classmethod
    def execute(cls, images=None, output_count=1) -> io.NodeOutput:
        flat = _flatten_images(images)
        n = max(1, min(MAX_OUTPUTS, _as_scalar_int(output_count)))
        results: list[torch.Tensor | None] = []
        for i in range(MAX_OUTPUTS):
            if i < n:
                results.append(flat[i] if i < len(flat) else None)
            else:
                results.append(None)
        return io.NodeOutput(*results)


NODE_CLASS_MAPPINGS = {
    "HonorLeeImageListSplit": HonorLeeImageListSplit,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HonorLeeImageListSplit": "Image List Split（图像列表拆分）",
}
