"""테스트 챗봇의 '대화 시작 알림'을 꺼내 오고(pending) 보냄 표시(ack)를 한다. 토큰은 .env의 NOTIFY_TOKEN에서 읽고 출력하지 않는다.

사용:
  python scripts/chat_notify.py pending          → 아직 안 보낸 알림을 JSON으로 출력
  python scripts/chat_notify.py ack KEY [KEY …]  → 보낸 알림을 '보냄'으로 표시
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://addiagram-test.landing-test.workers.dev"
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def token():
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("NOTIFY_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("NOTIFY_TOKEN이 .env에 없습니다.")


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"authorization": f"Bearer {token()}", "content-type": "application/json", "user-agent": "appd-chat-notify"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"요청 실패: {e.code} {e.read().decode(errors='replace')[:200]}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) >= 2 and sys.argv[1] == "pending":
        rows = call("GET", "/api/notify/pending")
        print(json.dumps([{k: r.get(k, "") for k in ("key", "startedAt", "name", "org", "email", "firstQuestion")} for r in rows], ensure_ascii=False, indent=1))
    elif len(sys.argv) >= 3 and sys.argv[1] == "ack":
        print(json.dumps(call("POST", "/api/notify/ack", {"keys": sys.argv[2:]}), ensure_ascii=False))
    else:
        sys.exit(__doc__)
