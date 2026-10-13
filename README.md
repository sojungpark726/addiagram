# 앱디팀 워크플로우 다이어그램 (addiagram)

앱디팀 워크플로우 표(작업 76개)를 역할 레인 다이어그램으로 보여 주는 웹페이지입니다. 우측 하단에 안내 챗봇이 있습니다. 표의 내용을 Claude가 제대로 이해했는지 눈으로 확인하는 용도입니다.

## 배포 주소

| 곳 | 주소 | 배포 방법 |
| --- | --- | --- |
| Vercel | https://addiagram.vercel.app/ | `main`에 push하면 자동 배포 |
| Cloudflare Workers | https://addiagram.landing-test.workers.dev | 직접 `wrangler deploy --secrets-file .env` |
| 테스트 빌드 (Cloudflare) | https://addiagram-test.landing-test.workers.dev/test/ | 직접 `wrangler deploy -c wrangler.test.jsonc --secrets-file .env` |

### 안내 챗봇

- 사이트 우측 하단 챗봇의 서버는 Cloudflare Worker(`worker/`)입니다. Vercel에는 서버가 없어서, Vercel 사이트의 챗봇은 Cloudflare 정식 Worker의 `/api/chat/*`를 부릅니다(`wrangler.jsonc`의 `ALLOWED_ORIGINS`에 Vercel 주소만 허용).
- 관리자 페이지: 정식 https://addiagram.landing-test.workers.dev/admin/ (Vercel의 `/admin/`은 이 주소로 넘어감), 테스트 https://addiagram-test.landing-test.workers.dev/test/admin/
- 정식과 테스트는 대화 기록 · Q&A · 설정을 따로 저장합니다(KV가 다름). 새 기능은 테스트에서 먼저 확인한 뒤 정식으로 올립니다.
- 비밀값(OpenAI 키 · 관리자 비밀번호 · 알림 토큰)은 `.env`에만 적습니다(`.env.example` 참고, git에 올리지 않음).
- 대화 시작 알림: Claude 예약 작업이 매시간 `python scripts/chat_notify.py pending`으로 정식 · 테스트의 새 대화를 모아 Gmail로 보내고 `ack`로 보냄 표시를 합니다.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `site/index.html` | 페이지 본문 (아티팩트 형식이라 `<head>` 없음) |
| `site/workflow-data.js` | 표에서 뽑은 데이터 (워크플로우 · 요약 · 범례 시트, 유형 색) |
| `site/fonts/` | Pretendard Variable (랜딩페이지와 같은 서체) |
| `site/build_data.py` | 표(xlsx) → `workflow-data.js` 변환 |
| `scripts/build-site.mjs` | 배포할 파일만 `public/`에 모으고 문서 틀로 감쌈 (Vercel · Cloudflare 공용) |
| `vercel.json` · `wrangler.jsonc` · `wrangler.test.jsonc` | 배포 설정 (정식 · 테스트) |
| `worker/` | 챗봇 · 관리자 · 알림 서버 (Cloudflare Worker, 정식 · 테스트 공용) |
| `site/test/` | 챗봇 위젯(`chat.js` · `chat.css`)과 관리자 페이지(`admin.html`), 정식 · 테스트 빌드 공용 |
| `scripts/chat_notify.py` | 대화 시작 알림 목록 꺼내기 · 보냄 표시 |
| `레퍼런스_분석_노드제작방식.md` | 설계서 (노드 제작 방식 · 시각 연출 · 데이터 규칙 · 수정 기록) |
| `볼륨_측정_기준.md` | 디자인 볼륨 측정 기준 (표의 ‘볼륨 기준’ 시트 정리, 사이트 아래쪽 ‘볼륨 측정’ 영역과 같은 내용) |

원본 표(`앱디팀_워크플로우.xlsx`, `.csv`)에는 개인별 실적 시트가 있어서 저장소에 올리지 않습니다(`.gitignore`).

## 수정하고 배포하기

1. 표를 고쳤다면 원본 표가 있는 PC에서 데이터를 다시 만듭니다.

   ```bash
   python site/build_data.py
   ```

2. 커밋하고 push합니다. **Vercel은 push만 하면 자동으로 다시 배포됩니다.**
3. **Cloudflare는 자동 배포가 아니어서 직접 올려야 합니다.** 빌드(`public/` 만들기)는 wrangler가 먼저 실행합니다.

   ```bash
   npx wrangler deploy --secrets-file .env
   ```

   이 PC처럼 프로젝트에 wrangler가 설치되어 있지 않으면 설치된 wrangler를 직접 실행합니다.

   ```bash
   node C:\Users\susan726\Documents\my-first-worker\node_modules\wrangler\bin\wrangler.js deploy --secrets-file .env
   ```

## 링크 미리보기 (OG)

- 사이트 이름 · 소개글 · 대표 주소는 `scripts/build-site.mjs` 맨 위 `SITE`에 있습니다. 대표 주소는 Vercel(https://addiagram.vercel.app/)이고, Cloudflare 배포도 같은 주소를 가리킵니다.
- 미리보기 이미지는 `site/og-image.png`(1200×630)이고, 원본은 `site/og/og.html`입니다. 고친 뒤에는 로컬 미리보기 서버(`python .claude/serve.py`)를 켜고 다시 찍습니다.

  ```bash
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot="site\og-image.png" "http://127.0.0.1:5173/og/og.html"
  ```

## 로컬에서 보기

```bash
node scripts/build-site.mjs
```

만들어진 `public/index.html`을 브라우저로 열거나, `python .claude/serve.py`로 `site/`를 http://127.0.0.1:5173 에서 띄웁니다.
