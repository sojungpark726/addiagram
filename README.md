# 앱디팀 워크플로우 다이어그램 (addiagram)

앱디팀 워크플로우 표(작업 76개)를 역할 레인 다이어그램으로 보여 주는 정적 웹페이지입니다. 표의 내용을 Claude가 제대로 이해했는지 눈으로 확인하는 용도입니다.

## 배포 주소

| 곳 | 주소 | 배포 방법 |
| --- | --- | --- |
| Vercel | https://addiagram.vercel.app/ | `main`에 push하면 자동 배포 |
| Cloudflare Workers | https://addiagram.landing-test.workers.dev | 직접 `wrangler deploy` |

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `site/index.html` | 페이지 본문 (아티팩트 형식이라 `<head>` 없음) |
| `site/workflow-data.js` | 표에서 뽑은 데이터 (워크플로우 · 요약 · 범례 시트, 유형 색) |
| `site/fonts/` | Pretendard Variable (랜딩페이지와 같은 서체) |
| `site/build_data.py` | 표(xlsx) → `workflow-data.js` 변환 |
| `scripts/build-site.mjs` | 배포할 파일만 `public/`에 모으고 문서 틀로 감쌈 (Vercel · Cloudflare 공용) |
| `vercel.json` · `wrangler.jsonc` | 배포 설정 |
| `레퍼런스_분석_노드제작방식.md` | 설계서 (노드 제작 방식 · 시각 연출 · 데이터 규칙 · 수정 기록) |

원본 표(`앱디팀_워크플로우.xlsx`, `.csv`)에는 개인별 실적 시트가 있어서 저장소에 올리지 않습니다(`.gitignore`).

## 수정하고 배포하기

1. 표를 고쳤다면 원본 표가 있는 PC에서 데이터를 다시 만듭니다.

   ```bash
   python site/build_data.py
   ```

2. 커밋하고 push합니다. **Vercel은 push만 하면 자동으로 다시 배포됩니다.**
3. **Cloudflare는 자동 배포가 아니어서 직접 올려야 합니다.** 빌드(`public/` 만들기)는 wrangler가 먼저 실행합니다.

   ```bash
   npx wrangler deploy
   ```

   이 PC처럼 프로젝트에 wrangler가 설치되어 있지 않으면 설치된 wrangler를 직접 실행합니다.

   ```bash
   node C:\Users\susan726\Documents\my-first-worker\node_modules\wrangler\bin\wrangler.js deploy
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
