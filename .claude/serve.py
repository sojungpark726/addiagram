# 로컬 미리보기 서버: site/ 폴더를 UTF-8로 제공한다 (아티팩트 게시 때는 쓰지 않음)
import functools
import http.server
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        "": "text/html; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


http.server.ThreadingHTTPServer(("127.0.0.1", 5173), functools.partial(Handler, directory=str(SITE))).serve_forever()
