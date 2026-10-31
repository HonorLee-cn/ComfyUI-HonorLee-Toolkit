from ..sigmas_core import DEFAULT_SCHEDULE_STRING, build_sigmas, format_sigmas_string


class SigmasProducer:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {"default": 1024, "min": 16, "max": 8192, "step": 16}),
                "height": ("INT", {"default": 1024, "min": 16, "max": 8192, "step": 16}),
                "step": ("INT", {"default": 7, "min": 1, "max": 64}),
                "schedule": (
                    "STRING",
                    {"default": DEFAULT_SCHEDULE_STRING, "multiline": False},
                ),
                "zero_fill": ("BOOLEAN", {"default": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("sigmas_string",)
    FUNCTION = "produce"
    CATEGORY = "model/sampling/sigmas"
    DESCRIPTION = (
        "Build a comma-separated sigma schedule for Qwen Image from width, height, "
        "and a timestep (t) list. Connect sigmas_string to ManualSigmas."
    )

    def produce(self, width, height, step, schedule, zero_fill):
        sigmas = build_sigmas(width, height, step, schedule, zero_fill)
        return (format_sigmas_string(sigmas),)


NODE_CLASS_MAPPINGS = {
    "SigmasProducer": SigmasProducer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SigmasProducer": "Qwen Image Sigmas Producer",
}
