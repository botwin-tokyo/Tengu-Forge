import asyncio
import ipaddress
import json
import re

import aiohttp
from fastapi import HTTPException
from yarl import URL

from ..config import DATA_DIR
from ..models import HTTPAction

TARGETS_PATH = DATA_DIR / "http-targets.json"
PREVIEW_BYTES = 65536
METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}
RESERVED_HEADERS = {
    "host", "connection", "keep-alive", "transfer-encoding", "content-length",
    "upgrade", "expect", "te", "trailer", "proxy-connection", "proxy-authorization",
    "cookie", "x-api-key", "accept-encoding",
}


def target_for(action: HTTPAction):
    try:
        url = URL(action.url)
        if url.scheme not in {"http", "https"} or not url.host or url.user is not None or url.fragment:
            raise ValueError
        origin = str(url.origin())
    except ValueError:
        raise HTTPException(422, "Invalid HTTP(S) URL")
    try:
        policy = json.loads(TARGETS_PATH.read_text())
        if not isinstance(policy, dict):
            raise ValueError
        if origin not in policy:
            raise HTTPException(403, "Destination origin has not been approved by the operator")
        address = ipaddress.ip_address(policy[origin])
    except FileNotFoundError:
        raise HTTPException(403, "No HTTP destinations configured")
    except (OSError, ValueError, TypeError):
        raise HTTPException(503, "Invalid HTTP destination configuration")
    return url, address


async def send(action: HTTPAction):
    url, address = target_for(action)
    if action.method not in METHODS:
        raise HTTPException(422, "Unsupported HTTP method")
    headers = {"Host": url.host_port_subcomponent, "Accept-Encoding": "identity"}
    for header in action.headers:
        if (not re.fullmatch(r"[!#$%&'*+.^_`|~0-9a-zA-Z-]+", header.key)
                or header.key.lower() in RESERVED_HEADERS
                or any(ord(c) < 32 or ord(c) == 127 for c in header.value)):
            raise HTTPException(422, "Invalid or reserved outbound header")
        headers[header.key] = header.value
    # Connect directly to the operator's IP. Keep the original authority for
    # virtual hosting and hostname verification, including non-default ports.
    target = url.with_host(str(address)).extend_query([(p.key, p.value) for p in action.queryParams])
    timeout = aiohttp.ClientTimeout(total=15)
    try:
        async with aiohttp.ClientSession(timeout=timeout, trust_env=False, auto_decompress=False,
                                         cookie_jar=aiohttp.DummyCookieJar()) as session:
            async with session.request(action.method, target, headers=headers,
                                       data=action.body if action.method not in {"GET", "HEAD"} else None,
                                       allow_redirects=False,
                                       server_hostname=url.raw_host if url.scheme == "https" else None) as response:
                if response.headers.get("Content-Encoding", "identity").lower() != "identity":
                    return {"status": response.status, "preview": "[encoded response omitted]", "truncated": False}
                preview = bytearray()
                async for chunk in response.content.iter_chunked(8192):
                    preview.extend(chunk[:PREVIEW_BYTES + 1 - len(preview)])
                    if len(preview) > PREVIEW_BYTES:
                        break
                return {"status": response.status, "preview": preview[:PREVIEW_BYTES].decode(errors="replace"),
                        "truncated": len(preview) > PREVIEW_BYTES}
    except asyncio.TimeoutError:
        raise HTTPException(504, "Destination timed out")
    except (aiohttp.ClientError, OSError, ValueError):
        raise HTTPException(502, "Could not complete request to approved destination")
