from comfy_api.latest import io
from comfy_execution.graph_utils import ExecutionBlocker


def _slot_value(val):
    if isinstance(val, tuple) and len(val) == 2 and isinstance(val[1], str):
        return val[0]
    return val


def _value_key_index(key: str) -> int:
    if key.startswith("value") and key[5:].isdigit():
        return int(key[5:])
    return 10**9


def _ordered_value_keys(values: io.Autogrow.Type) -> list[str]:
    return sorted(values.keys(), key=_value_key_index)


class FirstAvailable(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        mtemplate = io.MatchType.Template("first")
        minput = io.MatchType.Input("value", template=mtemplate, lazy=True, optional=True)
        template = io.Autogrow.TemplatePrefix(input=minput, prefix="value", min=1, max=32)
        return io.Schema(
            node_id="HonorLeeFirstAvailable",
            display_name="First Available",
            category="HonorLee/utils",
            description=(
                "Output the first truthy connected input in order (value0, value1, …). "
                "Skips falsy values such as 0, False, and empty strings. "
                "Only evaluates upstream nodes until a truthy value is found. "
                "Skips muted or blocked upstream outputs."
            ),
            search_aliases=["coalesce", "fallback", "first available", "首个可用"],
            inputs=[
                io.Autogrow.Input("values", template=template),
            ],
            outputs=[
                io.MatchType.Output(template=mtemplate, display_name="output"),
            ],
        )

    @classmethod
    def validate_inputs(cls, values: io.Autogrow.Type):
        if not values:
            return "At least one value input must be connected"
        return True

    @classmethod
    def check_lazy_status(cls, values: io.Autogrow.Type):
        needed = []
        for key in _ordered_value_keys(values):
            val = _slot_value(values[key])
            if val is None:
                needed.append(f"values.{key}")
            elif isinstance(val, ExecutionBlocker):
                continue
            elif val:
                return []
        return needed

    @classmethod
    def execute(cls, values: io.Autogrow.Type) -> io.NodeOutput:
        for key in _ordered_value_keys(values):
            val = _slot_value(values[key])
            if val is None or isinstance(val, ExecutionBlocker):
                continue
            if val:
                return io.NodeOutput(val)
        raise ValueError("No truthy input found among connected values")


NODE_CLASS_MAPPINGS = {
    "HonorLeeFirstAvailable": FirstAvailable,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HonorLeeFirstAvailable": "First Available（首个可用）",
}
