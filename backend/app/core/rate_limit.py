import time
import logging
from collections import defaultdict
from collections.abc import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    pass


class InMemoryRateLimiter:
    """Simple sliding-window in-memory rate limiter."""

    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        window_start = now - window_seconds
        windows = self._windows[key]
        windows[:] = [t for t in windows if t > window_start]
        if len(windows) >= max_requests:
            return False
        windows.append(now)
        return True


_limiter = InMemoryRateLimiter()

RATE_LIMITS: list[tuple[str, int, int]] = [
    ("/api/auth/login", 10, 60),
    ("/api/auth/register", 5, 60),
    ("/api/auth/forgot-password", 3, 60),
    ("/api/auth/refresh", 10, 60),
    ("/api/conversations/", 30, 60),
    ("/api/ai/", 30, 60),
    ("/api/learning/doubts", 30, 60),
    ("/api/admin/upload-pdf", 10, 60),
    ("/api/admin/knowledge/upload", 10, 60),
    ("/api/admin/pdf-extraction/upload", 10, 60),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        for prefix, max_req, window in RATE_LIMITS:
            if path.startswith(prefix):
                key = f"{client_ip}:{prefix}"
                allowed = _limiter.check(key, max_req, window)
                if not allowed:
                    logger.warning("Rate limit exceeded: %s from %s", prefix, client_ip)
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please slow down."},
                        headers={"Retry-After": str(window)},
                    )
                break

        return await call_next(request)
