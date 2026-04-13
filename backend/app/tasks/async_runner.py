import asyncio
import sys
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")

_LOOP: asyncio.AbstractEventLoop | None = None


def _ensure_windows_policy() -> None:
    if not sys.platform.startswith("win"):
        return
    policy = asyncio.get_event_loop_policy()
    if policy.__class__.__name__ == "WindowsSelectorEventLoopPolicy":
        return
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        # If policy cannot be changed in this runtime, continue with current policy.
        pass


def _get_loop() -> asyncio.AbstractEventLoop:
    global _LOOP
    _ensure_windows_policy()
    if _LOOP is None or _LOOP.is_closed():
        _LOOP = asyncio.new_event_loop()
    return _LOOP


def run_async(factory: Callable[[], Awaitable[T]]) -> T:
    """Run an async callable on a stable, process-local event loop.

    Celery task functions are synchronous; this bridges them to async code
    without creating and closing a brand-new loop for each task call.
    """
    loop = _get_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(factory())
