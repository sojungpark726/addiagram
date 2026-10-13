// 안내 챗봇 위젯 (정식 · 테스트 빌드 공용). 서버: /api/chat/*
// <script data-api="https://…">가 있으면 그 서버로 보낸다 (Vercel처럼 서버가 없는 곳). 없으면 같은 주소.
(function () {
  const API = `${(document.currentScript?.dataset.api || '').replace(/\/+$/, '')}/api/chat`;
  const KEY = 'appd-chat-session';
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); e.innerHTML = html; return e; };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const save = (v) => { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } };

  const btn = el('button', { type: 'button', class: 'cb-btn', 'aria-label': '안내 챗봇 열기', 'aria-expanded': 'false', 'aria-controls': 'cbPanel' },
    '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h11A3.5 3.5 0 0 1 23 6.5v8a3.5 3.5 0 0 1-3.5 3.5H12l-5 4.5V18A3.5 3.5 0 0 1 5 14.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="11.5" y="7.5" width="5" height="5" fill="currentColor" transform="rotate(45 14 10)"/></svg>');
  const panel = el('section', { class: 'cb-panel', id: 'cbPanel', role: 'dialog', 'aria-label': '안내 챗봇', 'aria-modal': 'false' }, `
    <div class="cb-head"><span class="cb-dia" aria-hidden="true"></span><div><b>안내 챗봇</b><br><small>App Design 워크플로우${location.pathname.startsWith('/test/') ? ' · 테스트' : ''}</small></div><button type="button" class="cb-x" aria-label="챗봇 닫기">✕</button></div>
    <div class="cb-body" id="cbBody" aria-live="polite"></div>
    <form class="cb-foot" id="cbFoot" hidden><textarea id="cbInput" rows="1" placeholder="질문을 입력하세요" aria-label="질문"></textarea><button type="submit" class="cb-send" id="cbSend">보내기</button><span class="cb-meta" id="cbMeta"></span></form>`);
  document.body.append(btn, panel);
  const body = panel.querySelector('#cbBody'), foot = panel.querySelector('#cbFoot'), input = panel.querySelector('#cbInput'), send = panel.querySelector('#cbSend'), meta = panel.querySelector('#cbMeta');
  let state = load(); // { sessionId, msgs: [{who, text, warn}], locked, remaining }
  let maxLen = 300;

  const add = (who, text, warn) => {
    const m = el('div', { class: `cb-msg ${who}${warn ? ' warn' : ''}` });
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  };
  const render = () => {
    body.innerHTML = '';
    if (!state?.sessionId) return renderForm();
    state.msgs.forEach((m) => add(m.who, m.text, m.warn));
    foot.hidden = false;
    setLocked(state.locked);
  };
  const setLocked = (locked) => {
    input.disabled = send.disabled = !!locked;
    meta.textContent = locked ? '대화가 끝났어요. 창을 새로 열면 다시 시작할 수 있어요.' : state?.remaining != null ? `남은 질문 ${state.remaining}개 · 최대 ${maxLen}자` : `최대 ${maxLen}자`;
  };
  function renderForm() {
    foot.hidden = true;
    const f = el('form', { class: 'cb-form', novalidate: '' }, `
      <p>대화를 시작하기 전에 알려 주세요.</p>
      <label>이름 (필수)<input name="name" maxlength="30" autocomplete="name" required></label>
      <label>소속 (선택)<input name="org" maxlength="40" autocomplete="organization"></label>
      <label>이메일 (선택)<input name="email" type="email" maxlength="80" autocomplete="email"></label>
      <p class="cb-note">입력한 이름 · 소속 · 이메일과 대화 내용은 관리자에게 전달되고 30일 동안 보관됩니다. 부정 사용을 막기 위해 접속 정보는 암호화한 값으로만 잠시 보관합니다. 사이트와 관련 없는 질문이나 같은 질문 반복이 쌓이면 대화가 종료될 수 있어요.</p>
      <span class="cb-err" role="alert"></span>
      <button type="submit">대화 시작</button>`);
    body.appendChild(f);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = f.querySelector('.cb-err'), b = f.querySelector('button');
      const data = Object.fromEntries(new FormData(f));
      if (!String(data.name || '').trim()) { err.textContent = '이름을 입력해 주세요.'; return; }
      b.disabled = true; err.textContent = '';
      try {
        const r = await fetch(`${API}/start`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json();
        if (!r.ok || j.blocked) { err.textContent = j.error || j.message || '대화를 시작할 수 없어요.'; b.disabled = false; return; }
        state = { sessionId: j.sessionId, msgs: [{ who: 'bot', text: j.welcome }], locked: false, remaining: null };
        save(state); render(); input.focus();
      } catch (x) { err.textContent = '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'; b.disabled = false; }
    });
    setTimeout(() => f.querySelector('input[name="name"]').focus(), 50);
  }
  async function ask(text) {
    state.msgs.push({ who: 'me', text }); add('me', text);
    const wait = el('div', { class: 'cb-msg bot wait', 'aria-label': '답변을 준비하는 중' }, '<i></i><i></i><i></i>');
    body.appendChild(wait); body.scrollTop = body.scrollHeight;
    input.disabled = send.disabled = true;
    try {
      const r = await fetch(`${API}/message`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId, message: text }) });
      const j = await r.json();
      wait.remove();
      if (r.status === 404) { state = null; save(null); add('bot', j.error || '대화를 찾을 수 없어요. 새로 시작해 주세요.', true); setTimeout(render, 1500); return; }
      const warn = ['off_topic', 'prompt_attack', 'duplicate', 'gibberish', 'abuse', 'locked', 'blocked', 'limit', 'throttle'].includes(j.kind);
      const reply = j.reply || j.error || '답변을 받지 못했어요.';
      state.msgs.push({ who: 'bot', text: reply, warn }); add('bot', reply, warn);
      state.locked = !!j.locked; if (j.remaining != null) state.remaining = j.remaining;
    } catch (x) {
      wait.remove(); add('bot', '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.', true);
    }
    save(state); setLocked(state.locked);
    if (!state.locked) input.focus();
  }
  foot.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    if (text.length > maxLen) { meta.textContent = `질문은 ${maxLen}자까지 쓸 수 있어요 (지금 ${text.length}자).`; return; }
    input.value = ''; ask(text);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); foot.requestSubmit(); } });
  const toggle = (open) => {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '안내 챗봇 닫기' : '안내 챗봇 열기');
    if (open) { if (!body.childElementCount) render(); (state?.sessionId ? input : panel.querySelector('input'))?.focus(); }
  };
  btn.addEventListener('click', () => toggle(!panel.classList.contains('open')));
  panel.querySelector('.cb-x').addEventListener('click', () => { toggle(false); btn.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) { toggle(false); btn.focus(); } });
  fetch(`${API}/config`).then((r) => r.json()).then((c) => { if (c.maxLen) maxLen = c.maxLen; }).catch(() => {});
})();
