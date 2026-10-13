// 배포할 파일만 public/에 모은다. Vercel(Linux)과 Cloudflare(Windows cmd)에서 똑같이 돌도록 Node 기본 모듈만 쓴다.
// site/index.html은 아티팩트용이라 <!doctype>·<head>가 없어서, 여기서 문서 틀로 감싼다.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 링크 미리보기: 대표 주소는 Vercel (Cloudflare 배포도 같은 주소를 가리킴)
const SITE = {
  url: 'https://addiagram.vercel.app/',
  name: 'App Design 워크플로우',
  title: 'App Design 워크플로우 다이어그램',
  description: '앱디팀(App Design)의 디자인 업무 흐름을 과정·역할별로 한눈에 보는 워크플로우 다이어그램입니다. 컨펌·반려 흐름과 승인자, 반복 작업을 확인할 수 있습니다.',
  image: 'og-image.png',
  imageAlt: 'App Design 워크플로우 다이어그램',
  // 챗봇 서버: Cloudflare 정식 Worker. Vercel에는 서버가 없어서 정식 빌드의 챗봇은 이 주소를 부른다
  chatApi: 'https://addiagram.landing-test.workers.dev',
};
const attr = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const metaTags = [
  `<meta name="description" content="${attr(SITE.description)}">`,
  `<link rel="canonical" href="${SITE.url}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:locale" content="ko_KR">`,
  `<meta property="og:site_name" content="${attr(SITE.name)}">`,
  `<meta property="og:title" content="${attr(SITE.title)}">`,
  `<meta property="og:description" content="${attr(SITE.description)}">`,
  `<meta property="og:url" content="${SITE.url}">`,
  `<meta property="og:image" content="${SITE.url}${SITE.image}">`,
  `<meta property="og:image:type" content="image/png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${attr(SITE.imageAlt)}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${attr(SITE.title)}">`,
  `<meta name="twitter:description" content="${attr(SITE.description)}">`,
  `<meta name="twitter:image" content="${SITE.url}${SITE.image}">`,
].join('\n');
const src = join(root, 'site');
// --test: 테스트 빌드 → public-test/test/ (Cloudflare addiagram-test Worker 전용). 챗봇은 같은 주소의 서버를 부른다
const TEST = process.argv.includes('--test');
const outRoot = join(root, TEST ? 'public-test' : 'public');
const out = TEST ? join(outRoot, 'test') : outRoot;

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1) index.html: <header> 앞(제목 · 폰트 · 스타일)은 <head>로, 나머지는 <body>로
const page = readFileSync(join(src, 'index.html'), 'utf8');
const cut = page.indexOf('<header');
if (cut < 0) throw new Error('site/index.html에서 <header>를 찾지 못했습니다.');
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${TEST ? '<meta name="robots" content="noindex, nofollow">' : metaTags}
${page.slice(0, cut).trim()}
<link rel="stylesheet" href="chat.css">
</head>
<body>
${page.slice(cut).trim()}
<script src="chat.js"${TEST ? '' : ` data-api="${SITE.chatApi}"`} defer></script>
</body>
</html>
`;
writeFileSync(join(out, 'index.html'), html);

// 2) 데이터 · 폰트 · 링크 미리보기 이미지 (원본은 site/og/og.html)
cpSync(join(src, 'workflow-data.js'), join(out, 'workflow-data.js'));
cpSync(join(src, SITE.image), join(out, SITE.image));
cpSync(join(src, 'fonts'), join(out, 'fonts'), { recursive: true });

// 3) 챗봇 위젯과 관리자 페이지 (원본은 site/test/)
cpSync(join(src, 'test', 'chat.js'), join(out, 'chat.js'));
cpSync(join(src, 'test', 'chat.css'), join(out, 'chat.css'));
mkdirSync(join(out, 'admin'), { recursive: true });
cpSync(join(src, 'test', 'admin.html'), join(out, 'admin', 'index.html'));

// 결과 목록
const list = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? list(p) : [p];
});
for (const f of list(outRoot)) console.log(`${relative(root, f).replaceAll('\\', '/')}  ${statSync(f).size} bytes`);
