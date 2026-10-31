"""Workflow Scheme Switch — switch node/group modes per named scheme from one card.

Frontend-only panel: schemes store Normal / Bypass / Mute per listed node or
group. Registered here so workflows resolve the pack; the frontend marks it
virtual so it never enters a prompt.
"""

from __future__ import annotations


class WorkflowSchemeSwitch:
    CATEGORY = "workflow"
    DESCRIPTION = (
        "Save and switch Normal, Bypass, and Mute for chosen nodes and groups "
        "under named schemes. Edit mode manages schemes and the member list; "
        "normal mode switches schemes and toggles each row. Never runs and "
        "has no wires."
    )
    SEARCH_ALIASES = [
        "scheme",
        "preset",
        "bypass",
        "mute",
        "workflow switch",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ()
    FUNCTION = "noop"

    def noop(self):
        return ()


NODE_CLASS_MAPPINGS = {
    "WorkflowSchemeSwitch": WorkflowSchemeSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WorkflowSchemeSwitch": "Workflow Scheme Switch",
}
