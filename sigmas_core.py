import math
import re

DEFAULT_T_SCHEDULE = [1.0, 0.9375, 0.875, 0.75, 0.5, 0.25, 0.0]

DEFAULT_SCHEDULE_STRING = ", ".join(f"{t:g}" if t != 0 else "0" for t in DEFAULT_T_SCHEDULE)


def parse_schedule(schedule: str) -> list[float]:
    values = re.findall(r"[-+]?(?:\d*\.*\d+)", schedule or "")
    return [float(v) for v in values]


def compute_mu(width: int, height: int) -> float:
    tokens = (width / 16) * (height / 16)
    return 0.5 + 0.4 * (tokens - 256) / 7936


def sigma_at_t(mu: float, t: float) -> float:
    if t == 0:
        return 0.0
    em = math.exp(mu)
    return em / (em + (1.0 / t) - 1.0)


def build_sigmas(
    width: int,
    height: int,
    step: int,
    schedule_str: str,
    zero_fill: bool,
) -> list[float]:
    step = max(0, int(step))
    ts = parse_schedule(schedule_str)
    if not ts:
        ts = list(DEFAULT_T_SCHEDULE)
    ts = ts[:step]

    mu = compute_mu(width, height)
    sigmas = [sigma_at_t(mu, t) for t in ts]

    if zero_fill:
        while len(sigmas) < step:
            sigmas.append(0.0)

    return sigmas


def format_sigmas_string(sigmas: list[float]) -> str:
    return ", ".join(f"{v:.6f}" for v in sigmas)
