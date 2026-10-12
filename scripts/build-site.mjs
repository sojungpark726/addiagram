// 배포할 파일만 public/에 모은다. Vercel(Linux)과 Cloudflare(Windows cmd)에서 똑같이 돌도록 Node 기본 모듈만 쓴다.
// site/index.html은 아티팩트용이라 <!doctype>·<head>가 없어서, 여기서 문서 틀로 감싼다.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'site');
const out = join(root, 'public');

rmSync(out, { recursive: true, force: true });
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
${page.slice(0, cut).trim()}
</head>
<body>
${page.slice(cut).trim()}
</body>
</html>
`;
writeFileSync(join(out, 'index.html'), html);

// 2) 데이터와 폰트
cpSync(join(src, 'workflow-data.js'), join(out, 'workflow-data.js'));
cpSync(join(src, 'fonts'), join(out, 'fonts'), { recursive: true });

// 결과 목록
const list = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? list(p) : [p];
});
for (const f of list(out)) console.log(`${relative(root, f).replaceAll('\\', '/')}  ${statSync(f).size} bytes`);
