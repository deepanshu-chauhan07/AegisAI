from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict
import re

# Rate limiter storage
request_counts = defaultdict(list)

RATE_LIMITS = {
    "/api/v1/auth/login": (5, 60),
    "/api/v1/auth/register": (3, 60),
    "default": (100, 60)
}

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Security headers
        client_ip = request.client.host
        path = request.url.path

        # Rate limiting
        limit, window = RATE_LIMITS.get(path, RATE_LIMITS["default"])
        now = time.time()
        request_counts[f"{client_ip}:{path}"] = [
            t for t in request_counts[f"{client_ip}:{path}"]
            if now - t < window
        ]
        if len(request_counts[f"{client_ip}:{path}"]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
        request_counts[f"{client_ip}:{path}"].append(now)

        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response
