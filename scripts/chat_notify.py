"""챗봇의 '대화 시작 알림'을 꺼내 오고(pending) 보냄 표시(ack)를 한다. 정식 · 테스트 두 사이트를 함께 본다.
토큰은 .env의 NOTIFY_TOKEN에서 읽고 출력하지 않는다.

사용:
  python scripts/chat_notify.py pending          → 아직 안 보낸 알림을 JSON으로 출력 (site: 정식/테스트, admin: 관리자 페이지)
  python scripts/chat_notify.py ack KEY [KEY …]  → 보낸 알림을 '보냄'으로 표시 (KEY는 pending이 준 그대로)
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

# KEY 앞머리 → (사이트 이름, 서버 주소, 관리자 페이지)
SITES = {
    "prod": ("정식", "https://addiagram.landing-test.workers.dev", "https://addiagram.landing-test.workers.dev/admin/"),
    "test": ("테스트", "https://addiagram-test.landing-test.workers.dev", "https://addiagram-test.landing-test.workers.dev/test/admin/"),
}
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def token():
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("NOTIFY_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("NOTIFY_TOKEN이 .env에 없습니다.")


def call(base, method, path, body=None):
    req = urllib.request.Request(base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"authorization": f"Bearer {token()}", "content-type": "application/json", "user-agent": "appd-chat-notify"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"요청 실패({base}): {e.code} {e.read().decode(errors='replace')[:200]}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) >= 2 and sys.argv[1] == "pending":
        out = []
        for sid, (label, base, admin) in SITES.items():
            for r in call(base, "GET", "/api/notify/pending"):
                out.append({"key": f"{sid}/{r['key']}", "site": label, "admin": admin,
                            **{k: r.get(k, "") for k in ("startedAt", "name", "org", "email", "firstQuestion")}})
        print(json.dumps(sorted(out, key=lambda r: r["startedAt"]), ensure_ascii=False, indent=1))
    elif len(sys.argv) >= 3 and sys.argv[1] == "ack":
        groups = {}
        for key in sys.argv[2:]:
            sid, _, raw = key.partition("/")
            if sid not in SITES or not raw:
                sys.exit(f"알 수 없는 KEY: {key}")
            groups.setdefault(sid, []).append(raw)
        print(json.dumps({SITES[sid][0]: call(SITES[sid][1], "POST", "/api/notify/ack", {"keys": keys}) for sid, keys in groups.items()}, ensure_ascii=False))
    else:
        sys.exit(__doc__)
