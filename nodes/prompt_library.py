"""Prompt Selector — multiline prompt with global library UI."""

from __future__ import annotations

from comfy_api.latest import io

from . import prompt_library_routes  # noqa: F401 — register HTTP routes


class HonorLeePromptSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="HonorLeePromptSelector",
            display_name="Prompt Selector (提示词选择器)",
            category="HonorLee/utils",
            description=(
                "Multiline prompt text with buttons to pick, save, and manage "
                "prompts in a global library shared across workflows."
            ),
            search_aliases=["prompt", "提示词", "prompt library", "selector", "提示词选择器"],
            inputs=[
                io.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    placeholder="Enter or load a prompt…",
                ),
            ],
            outputs=[
                io.String.Output(display_name="Prompt"),
            ],
        )

    @classmethod
    def execute(cls, prompt: str) -> io.NodeOutput:
        return io.NodeOutput(prompt)


NODE_CLASS_MAPPINGS = {
    "HonorLeePromptSelector": HonorLeePromptSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HonorLeePromptSelector": "Prompt Selector (提示词选择器)",
}
