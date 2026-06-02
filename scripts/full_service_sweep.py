import base64
import json
import os
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import requests
from playwright.sync_api import Error, TimeoutError, sync_playwright


HOSTS = [
    "https://www.pupoo.site",
    "https://pupoo.site",
]

PUBLIC_ROUTES = [
    "/",
    "/credits",
    "/event/current",
    "/event/upcoming",
    "/event/closed",
    "/program/all",
    "/community/freeboard",
    "/community/info",
    "/community/review",
    "/community/qna",
    "/community/notice",
    "/community/faq",
    "/gallery/eventgallery",
    "/info/location",
    "/guide/operation",
]

USER_ROUTES = [
    "/mypage",
    "/mypage/qr",
    "/registration/applyhistory",
    "/registration/paymenthistory",
    "/registration/qrcheckin",
]

ADMIN_ROUTES = [
    "/admin/dashboard",
    "/admin/event",
    "/admin/program",
    "/admin/realtime",
    "/admin/past",
    "/admin/zone",
    "/admin/contest",
    "/admin/session",
    "/admin/board",
    "/admin/board/notice",
    "/admin/board/reviews",
    "/admin/gallery",
    "/admin/reports",
    "/admin/refunds",
    "/admin/participant",
    "/admin/participant/checkin",
    "/admin/participant/session",
    "/admin/participant/payment",
    "/admin/participant/alert",
    "/admin/participant/stats",
]

USER_CREDS = {
    "email": "kkw421@icloud.com",
    "password": "pupoo1234!",
}

ADMIN_CREDS = {
    "email": "admin@pupoo.com",
    "password": "pupoo1234!",
}

PLACEHOLDER_MARKERS = [
    "This feature will be added soon.",
    "Preparing",
]

IGNORE_ERROR_SUBSTRINGS = [
    "favicon",
    "apple-touch-icon",
]

MINIMAL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn6eCkAAAAASUVORK5CYII="
)

ARTIFACT_DIR = Path("artifacts") / "service_sweep"


def unwrap(body):
    if isinstance(body, dict) and "data" in body:
        return body["data"]
    return body


def parse_json_response(response):
    try:
        return response.json()
    except Exception:
        return None


def get_access_token(body):
    data = unwrap(body) if isinstance(body, dict) else body
    if not isinstance(data, dict):
        return None
    return data.get("accessToken") or data.get("token")


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def create_session():
    session = requests.Session()
    session.headers.update({"User-Agent": "pupoo-full-service-sweep/1.0"})
    return session


def login(base_url, creds):
    session = create_session()
    response = session.post(f"{base_url}/api/auth/login", json=creds, timeout=60)
    body = parse_json_response(response)
    token = get_access_token(body)
    if response.status_code != 200 or not token:
        raise RuntimeError(f"login failed for {base_url}: status={response.status_code}")
    return session, token, body


def requests_cookies_to_playwright(session, base_url):
    parsed = urlparse(base_url)
    cookies = []
    for cookie in session.cookies:
        cookie_domain = cookie.domain or parsed.hostname
        item = {
            "name": cookie.name,
            "value": cookie.value,
            "domain": cookie_domain.lstrip("."),
            "path": cookie.path or "/",
            "httpOnly": bool(cookie._rest.get("HttpOnly")),
            "secure": bool(cookie.secure),
            "sameSite": "Lax",
        }
        if cookie.expires:
            item["expires"] = cookie.expires
        cookies.append(item)
    return cookies


def make_storage_script(user_token=None, admin_token=None):
    lines = []
    if user_token:
        lines.extend(
            [
                f"localStorage.setItem('pupoo_access_token', {json.dumps(user_token)});",
                "localStorage.setItem('pupoo_session_hint', '1');",
            ]
        )
    if admin_token:
        lines.append(f"localStorage.setItem('pupoo_admin_token', {json.dumps(admin_token)});")
    return "\n".join(lines)


def should_ignore_message(text):
    lowered = (text or "").lower()
    return any(needle in lowered for needle in IGNORE_ERROR_SUBSTRINGS)


def capture_page(page, url, expected_prefix=None, route_kind="public"):
    console_errors = []
    page_errors = []
    request_failures = []
    bad_responses = []

    def on_console(msg):
        try:
            if msg.type == "error" and not should_ignore_message(msg.text):
                console_errors.append(msg.text)
        except Error:
            pass

    def on_page_error(error):
        text = str(error)
        if not should_ignore_message(text):
            page_errors.append(text)

    def on_request_failed(request):
        failure = request.failure or ""
        url_text = request.url or ""
        joined = f"{request.method} {url_text} {failure}"
        if not should_ignore_message(joined):
            request_failures.append(joined)

    def on_response(response):
        if response.status < 400:
            return
        response_url = response.url or ""
        if not response_url.startswith("http"):
            return
        if should_ignore_message(response_url):
            return
        bad_responses.append(f"{response.status} {response.request.method} {response_url}")

    page.on("console", on_console)
    page.on("pageerror", on_page_error)
    page.on("requestfailed", on_request_failed)
    page.on("response", on_response)

    issue_messages = []
    final_url = None
    body_text = ""
    title = ""

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3500)
        final_url = page.url
        title = page.title()
        body_text = page.locator("body").inner_text(timeout=15000)
    except TimeoutError as exc:
        issue_messages.append(f"navigation timeout: {exc}")
    except Error as exc:
        issue_messages.append(f"navigation error: {exc}")

    if expected_prefix and final_url and not final_url.startswith(expected_prefix):
        issue_messages.append(f"redirected to unexpected url: {final_url}")

    if route_kind != "public" and final_url and "/auth/login" in final_url:
        issue_messages.append(f"protected route redirected to login: {final_url}")

    if not body_text.strip():
        issue_messages.append("empty body")

    for marker in PLACEHOLDER_MARKERS:
        if marker in body_text:
            issue_messages.append(f"placeholder marker visible: {marker}")

    if "Cannot GET /" in body_text:
        issue_messages.append("server returned raw cannot get page")

    if page_errors:
        issue_messages.append(f"page errors: {len(page_errors)}")
    if console_errors:
        issue_messages.append(f"console errors: {len(console_errors)}")
    if request_failures:
        issue_messages.append(f"request failures: {len(request_failures)}")
    if bad_responses:
        issue_messages.append(f"bad responses: {len(bad_responses)}")

    return {
        "url": url,
        "finalUrl": final_url,
        "title": title,
        "issues": issue_messages,
        "consoleErrors": console_errors[:10],
        "pageErrors": page_errors[:10],
        "requestFailures": request_failures[:10],
        "badResponses": bad_responses[:10],
        "bodyPreview": body_text[:500],
    }


def fetch_same_origin_health(page):
    script = """
        async () => {
          const urls = ['/api/health', '/ai/health'];
          const out = [];
          for (const path of urls) {
            const response = await fetch(path, { credentials: 'include' });
            const contentType = response.headers.get('content-type') || '';
            let preview = '';
            if (contentType.includes('application/json')) {
              const body = await response.json();
              preview = JSON.stringify(body).slice(0, 200);
            } else {
              preview = (await response.text()).slice(0, 200);
            }
            out.push({
              path,
              status: response.status,
              contentType,
              preview,
            });
          }
          return out;
        }
    """
    return page.evaluate(script)


def run_browser_sweep(host_states):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for host_state in host_states:
                base_url = host_state["baseUrl"]

                public_context = browser.new_context()
                page = public_context.new_page()
                public_results = []
                for route in PUBLIC_ROUTES:
                    public_results.append(
                        capture_page(page, f"{base_url}{route}", expected_prefix=base_url, route_kind="public")
                    )
                page.goto(f"{base_url}/", wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(2000)
                host_state["sameOriginHealth"] = fetch_same_origin_health(page)
                public_context.close()
                host_state["publicRoutes"] = public_results

                user_context = browser.new_context()
                user_context.add_cookies(host_state["userCookies"])
                storage_script = make_storage_script(user_token=host_state["userToken"])
                if storage_script:
                    user_context.add_init_script(storage_script)
                user_page = user_context.new_page()
                user_results = []
                for route in USER_ROUTES:
                    user_results.append(
                        capture_page(user_page, f"{base_url}{route}", expected_prefix=base_url, route_kind="user")
                    )
                user_context.close()
                host_state["userRoutes"] = user_results

                admin_context = browser.new_context()
                admin_context.add_cookies(host_state["adminCookies"])
                admin_storage_script = make_storage_script(admin_token=host_state["adminToken"])
                if admin_storage_script:
                    admin_context.add_init_script(admin_storage_script)
                admin_page = admin_context.new_page()
                admin_results = []
                for route in ADMIN_ROUTES:
                    admin_results.append(
                        capture_page(admin_page, f"{base_url}{route}", expected_prefix=base_url, route_kind="admin")
                    )
                admin_context.close()
                host_state["adminRoutes"] = admin_results
        finally:
            browser.close()


def require_ok(response, message):
    if response.status_code != 200:
        raise RuntimeError(f"{message}: status={response.status_code} body={response.text[:300]}")


def find_board_id(session, base_url, board_type):
    response = session.get(f"{base_url}/api/boards", params={"activeOnly": "true"}, timeout=60)
    require_ok(response, f"list boards {board_type}")
    body = unwrap(parse_json_response(response)) or []
    for item in body:
        if str(item.get("boardType", "")).upper() == board_type.upper():
            return item.get("boardId")
    raise RuntimeError(f"board type not found: {board_type}")


def run_write_checks(host_states):
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    marker = f"AUTO-SWEEP-{timestamp}-{uuid.uuid4().hex[:8]}"

    first_host = host_states[0]
    second_host = host_states[1]

    user_session = first_host["userSession"]
    admin_session = first_host["adminSession"]
    user_token = first_host["userToken"]
    admin_token = first_host["adminToken"]
    base_url = first_host["baseUrl"]

    free_board_id = find_board_id(user_session, base_url, "FREE")

    post_create = user_session.post(
        f"{base_url}/api/posts",
        headers=auth_headers(user_token),
        json={
            "boardId": free_board_id,
            "postTitle": f"{marker} freeboard",
            "content": f"<p>{marker} content</p>",
        },
        timeout=60,
    )
    require_ok(post_create, "create freeboard post")
    post_body = unwrap(parse_json_response(post_create))
    post_id = post_body.get("postId")

    post_update = user_session.put(
        f"{base_url}/api/posts/{post_id}",
        headers=auth_headers(user_token),
        json={
            "postTitle": f"{marker} freeboard updated",
            "content": f"<p>{marker} content updated</p>",
        },
        timeout=60,
    )
    require_ok(post_update, "update freeboard post")

    post_delete = user_session.delete(
        f"{base_url}/api/posts/{post_id}",
        headers=auth_headers(user_token),
        timeout=60,
    )
    require_ok(post_delete, "delete freeboard post")

    qna_create = second_host["userSession"].post(
        f"{second_host['baseUrl']}/api/qnas",
        headers=auth_headers(second_host["userToken"]),
        json={
            "title": f"{marker} qna",
            "content": f"{marker} qna body",
        },
        timeout=60,
    )
    require_ok(qna_create, "create qna")
    qna_body = unwrap(parse_json_response(qna_create))
    qna_id = qna_body.get("qnaId")

    qna_update = second_host["userSession"].patch(
        f"{second_host['baseUrl']}/api/qnas/{qna_id}",
        headers=auth_headers(second_host["userToken"]),
        json={
            "title": f"{marker} qna updated",
            "content": f"{marker} qna body updated",
        },
        timeout=60,
    )
    require_ok(qna_update, "update qna")

    qna_delete = second_host["userSession"].delete(
        f"{second_host['baseUrl']}/api/qnas/{qna_id}",
        headers=auth_headers(second_host["userToken"]),
        timeout=60,
    )
    require_ok(qna_delete, "delete qna")

    notice_create = admin_session.post(
        f"{base_url}/api/admin/notices",
        headers=auth_headers(admin_token),
        json={
            "scope": "ALL",
            "eventId": None,
            "title": f"{marker} notice",
            "content": f"{marker} notice body",
            "pinned": False,
            "status": "PUBLISHED",
        },
        timeout=60,
    )
    require_ok(notice_create, "create notice")
    notice_body = unwrap(parse_json_response(notice_create))
    notice_id = notice_body.get("noticeId")

    notice_update = admin_session.patch(
        f"{base_url}/api/admin/notices/{notice_id}",
        headers=auth_headers(admin_token),
        json={
            "scope": "ALL",
            "eventId": None,
            "title": f"{marker} notice updated",
            "content": f"{marker} notice body updated",
            "pinned": False,
            "status": "PUBLISHED",
        },
        timeout=60,
    )
    require_ok(notice_update, "update notice")

    notice_delete = admin_session.delete(
        f"{base_url}/api/admin/notices/{notice_id}",
        headers=auth_headers(admin_token),
        timeout=60,
    )
    require_ok(notice_delete, "delete notice")

    poster_upload = second_host["adminSession"].post(
        f"{second_host['baseUrl']}/api/admin/events/poster/upload",
        headers=auth_headers(second_host["adminToken"]),
        files={"file": ("auto-sweep.png", MINIMAL_PNG, "image/png")},
        timeout=120,
    )
    require_ok(poster_upload, "poster upload")
    poster_upload_body = unwrap(parse_json_response(poster_upload))

    poster_generate = second_host["adminSession"].post(
        f"{second_host['baseUrl']}/api/admin/events/poster/generate",
        headers=auth_headers(second_host["adminToken"]),
        json={
            "eventName": "AUTO SWEEP POSTER",
            "description": "Poster generation sweep test.",
            "startAt": "2026-03-29T10:00:00",
            "endAt": "2026-03-29T18:00:00",
            "location": "Songdo Convensia",
            "extraPrompt": "clean event poster",
        },
        timeout=180,
    )
    require_ok(poster_generate, "poster generate")
    poster_generate_body = unwrap(parse_json_response(poster_generate))

    public_chat = create_session().post(
        f"{base_url}/api/chatbot/chat",
        json={"message": "오늘 기준 진행 중인 행사 이름 하나와 장소를 알려줘"},
        timeout=120,
    )
    require_ok(public_chat, "public chatbot")
    public_chat_body = unwrap(parse_json_response(public_chat))

    admin_chat = admin_session.post(
        f"{base_url}/api/admin/chatbot/chat",
        headers=auth_headers(admin_token),
        json={"message": "현재 운영 중인 행사 하나와 추천 포인트를 짧게 알려줘"},
        timeout=120,
    )
    require_ok(admin_chat, "admin chatbot")
    admin_chat_body = unwrap(parse_json_response(admin_chat))

    public_ai = create_session().get(
        f"{base_url}/api/ai/events/1/congestion/predict",
        timeout=120,
    )
    require_ok(public_ai, "public ai predict")
    public_ai_body = unwrap(parse_json_response(public_ai))

    admin_ai = admin_session.get(
        f"{base_url}/api/admin/ai/events/1/congestion/predict",
        headers=auth_headers(admin_token),
        timeout=120,
    )
    require_ok(admin_ai, "admin ai predict")
    admin_ai_body = unwrap(parse_json_response(admin_ai))

    return {
        "marker": marker,
        "freeboard": {
            "postId": post_id,
            "deleted": True,
        },
        "qna": {
            "qnaId": qna_id,
            "deleted": True,
        },
        "notice": {
            "noticeId": notice_id,
            "deleted": True,
        },
        "posterUpload": {
            "assetUrl": poster_upload_body.get("url") if isinstance(poster_upload_body, dict) else None,
        },
        "posterGenerate": {
            "assetUrl": poster_generate_body.get("url") if isinstance(poster_generate_body, dict) else None,
        },
        "publicChatPreview": (public_chat_body or {}).get("answer", "")[:300]
        if isinstance(public_chat_body, dict)
        else str(public_chat_body)[:300],
        "adminChatPreview": (admin_chat_body or {}).get("answer", "")[:300]
        if isinstance(admin_chat_body, dict)
        else str(admin_chat_body)[:300],
        "publicAiFallbackUsed": public_ai_body.get("fallbackUsed") if isinstance(public_ai_body, dict) else None,
        "adminAiFallbackUsed": admin_ai_body.get("fallbackUsed") if isinstance(admin_ai_body, dict) else None,
    }


def collect_issues(report):
    issues = []

    for host in report["hosts"]:
        for entry in host.get("sameOriginHealth", []):
            preview = entry.get("preview", "")
            if entry.get("status") != 200:
                issues.append(
                    {
                        "severity": "high",
                        "host": host["baseUrl"],
                        "path": entry.get("path"),
                        "message": f"same-origin health returned {entry.get('status')}",
                    }
                )
            if "application/json" not in (entry.get("contentType") or ""):
                issues.append(
                    {
                        "severity": "high",
                        "host": host["baseUrl"],
                        "path": entry.get("path"),
                        "message": f"same-origin health returned non-json: {entry.get('contentType')}",
                        "preview": preview[:120],
                    }
                )
        for category in ("publicRoutes", "userRoutes", "adminRoutes"):
            for route_result in host.get(category, []):
                for message in route_result.get("issues", []):
                    issues.append(
                        {
                            "severity": "medium",
                            "host": host["baseUrl"],
                            "path": route_result.get("url"),
                            "message": message,
                        }
                    )

    write_checks = report.get("writeChecks") or {}
    if write_checks.get("publicAiFallbackUsed") is True:
        issues.append(
            {
                "severity": "high",
                "host": HOSTS[0],
                "path": "/api/ai/events/1/congestion/predict",
                "message": "public ai prediction fell back during sweep",
            }
        )
    if write_checks.get("adminAiFallbackUsed") is True:
        issues.append(
            {
                "severity": "high",
                "host": HOSTS[0],
                "path": "/api/admin/ai/events/1/congestion/predict",
                "message": "admin ai prediction fell back during sweep",
            }
        )

    return issues


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    started_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")

    host_states = []
    for base_url in HOSTS:
        user_session, user_token, _ = login(base_url, USER_CREDS)
        admin_session, admin_token, _ = login(base_url, ADMIN_CREDS)
        host_states.append(
            {
                "baseUrl": base_url,
                "userSession": user_session,
                "userToken": user_token,
                "userCookies": requests_cookies_to_playwright(user_session, base_url),
                "adminSession": admin_session,
                "adminToken": admin_token,
                "adminCookies": requests_cookies_to_playwright(admin_session, base_url),
            }
        )

    run_browser_sweep(host_states)
    write_checks = run_write_checks(host_states)

    host_results = []
    for host_state in host_states:
        host_results.append(
            {
                "baseUrl": host_state["baseUrl"],
                "sameOriginHealth": host_state.get("sameOriginHealth", []),
                "publicRoutes": host_state.get("publicRoutes", []),
                "userRoutes": host_state.get("userRoutes", []),
                "adminRoutes": host_state.get("adminRoutes", []),
            }
        )

    report = {
        "startedAt": started_at,
        "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "hosts": host_results,
        "writeChecks": write_checks,
    }
    report["issues"] = collect_issues(report)

    timestamp = time.strftime("%Y%m%d-%H%M%S")
    report_path = ARTIFACT_DIR / f"full-service-sweep-{timestamp}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    summary = {
        "report": str(report_path),
        "issueCount": len(report["issues"]),
        "hosts": [host["baseUrl"] for host in host_results],
        "writeMarker": write_checks.get("marker"),
    }
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == "__main__":
    main()
