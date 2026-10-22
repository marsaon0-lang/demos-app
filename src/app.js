// DEMOS Mini App v0 — кликабельная версия на тестовых данных
(function(){
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const store = {
  get(k,d){ try{ const v = localStorage.getItem('demos_'+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('demos_'+k, JSON.stringify(v)); }catch(e){} }
};
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const haptic = (t='light') => { try{ tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t); }catch(e){} };

// ---------- состояние ----------
const allTrails = () => [...S.myTrails.filter(t=>t.status==='active' && t.fresh), ...S.trails];
const S = {
  onboarded: store.get('onboarded', false),
  screen: null, params: {}, stack: [], sheet: null,
  tab: 'feed', feedTab: 'trails', profileTab: 'trails', subsTab: 'trails',
  trails: TRAILS.map(t => ({...t, my:{shared:false, x3d:null, tagAdded:false, subscribed:false, frag:0, seen:new Set([0]), thanked:false, expanded:false}})),
  myTrails: MY_TRAILS.map(t => ({...t, my:{frag:0, seen:new Set([0])}})),
  subs: new Set(store.get('subs', ['Москва','Хамовники','Помощь','Животные','ЖКХ','Дети','Дороги'])),
  residentOk: false, firstTrail: true, createdToday: false, lastAddAt: 0,
  wallet: {available:2497, vesting:5828, perDay:833, daysLeft:5, ton:null},
  myX3d: [{title:'Пропал пёс Рони', st:'Активна', info:'10 TON · №1', rew:'до 9 000 DEMOS'},{title:'Прорвало трубу на Профсоюзной', st:'Начислено', info:'5 TON · №14', rew:'8 325 DEMOS'}],
  draft: null, geo: {label:'Москва, улица Плющиха, 12', acc:'±20 м'},
  topics: new Set(['Город','Животные','Помощь']), details: new Set(),
  comments: JSON.parse(JSON.stringify(COMMENTS)), replyTo: null
};
const byId = id => [...S.trails, ...S.myTrails].find(t => t.id === id);

// ---------- иконки ----------
const I = {
  back:'<svg viewBox="0 0 10 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 1.5L1.5 9l7 7.5"/></svg>',
  trails:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5"/></svg>',
  comment:'<svg viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M4 5h18v13H11l-5 4v-4H4z"/></svg>',
  eye:'<svg viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2"><path d="M2 13s4-7 11-7 11 7 11 7-4 7-11 7S2 13 2 13z"/><circle cx="13" cy="13" r="3.5"/></svg>',
  create:'<svg class="create-btn" viewBox="0 0 60 53"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3DB4FF"/><stop offset="1" stop-color="#0166FF"/></linearGradient></defs><path d="M30 6.5L54 48H6z" fill="url(#cg)" stroke="url(#cg)" stroke-width="5" stroke-linejoin="round"/><path d="M30 26v14M23 33h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  logo:'<svg class="logo-tri" viewBox="0 0 124 110"><path d="M62 4L120 106H4z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>',
  share:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l9 16H3z"/></svg>'
};

// ---------- навигация ----------
function go(screen, params={}, push=true){
  if (push && S.screen) S.stack.push({screen:S.screen, params:S.params});
  S.screen = screen; S.params = params; S.sheet = null; render(true);
}
function back(){
  if (S.sheet){ closeSheet(); return; }
  const prev = S.stack.pop();
  if (prev){ S.screen = prev.screen; S.params = prev.params; render(false); }
}
function home(tab){ S.stack = []; S.tab = tab || S.tab; S.screen = 'main'; S.params = {}; S.sheet=null; render(false); }
function syncBackButton(){
  if (!tg || !tg.BackButton) return;
  try{ (S.stack.length || S.sheet) ? tg.BackButton.show() : tg.BackButton.hide(); }catch(e){}
}

// ---------- тосты ----------
let toastTimer;
function toast(msg){
  document.querySelectorAll('.toast').forEach(n=>n.remove());
  const d = document.createElement('div'); d.className='toast'; d.innerHTML = msg; $app.appendChild(d);
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>d.remove(), 2600);
}

// ---------- общие куски ----------
const topbar = (title, step='') => `<div class="topbar"><button class="back" data-a="back" aria-label="Назад">${I.back}</button><div class="ttl">${title}</div>${step?`<div class="step">${step}</div>`:''}</div>`;
const strengthHTML = (v, trend, label=true) => {
  if (!v) return '';
  let bars=''; for(let i=1;i<=10;i++) bars += `<i class="${i<=v?'on':''}" style="height:${4+i}px"></i>`;
  return `<span class="strength">${label?'<span>Сила</span>':''}<span class="sig">${bars}</span><span>${v}</span><span class="${trend==='up'?'up':'down'}">${trend==='up'?'↑':'↓'}</span></span>`;
};
const chipHTML = (tag, viewer) => `<button class="chip ${S.subs.has(tag[0])?'sub':''}" data-a="tag" data-tag="${esc(tag[0])}">${tag[2]||viewer?'<span class="vdot"></span>':''}<span>${esc(tag[0])}</span><span class="n">${esc(tag[1])}</span></button>`;

function bottomNav(){
  return `<nav class="bottom-nav">
    <button class="nav-item ${S.tab==='feed'?'on':''}" data-a="nav" data-t="feed">${I.trails}<span>Тропы</span></button>
    <button class="nav-item" data-a="create">${I.create}</button>
    <button class="nav-item ${S.tab==='profile'?'on':''}" data-a="nav" data-t="profile">${I.profile}<span>Профиль</span></button>
  </nav>`;
}

// ---------- карточка Тропы ----------
function cardHTML(t, opts={}){
  const f = t.frags[t.my.frag] || t.frags[0];
  const bars = t.frags.length>1 ? `<div class="bars">${t.frags.map((x,i)=>`<i class="${i<t.my.frag?'seen':i===t.my.frag?'cur':(t.my.seen.has(i)?'seen':'unread')}"></i>`).join('')}</div>` : '';
  const tags = t.tags.slice(0,10).map(tg=>chipHTML(tg)).join('') + (t.tags.length>10?`<button class="chip all" data-a="alltags" data-id="${t.id}">Все теги · ${t.tags.length}</button>`:'');
  const canAdd = !t.own && !t.my.tagAdded;
  const author = t.own
    ? `<div class="author"><div class="who"><div class="nick">@${t.author}</div><div class="meta">Ваша Тропа · ${t.ago}</div></div><button class="more" data-a="menu" data-id="${t.id}">⋯</button></div>`
    : `<div class="author"><button class="who" data-a="author" data-id="${t.id}" style="text-align:left"><div class="nick">@${t.author}</div><div class="meta">${t.ago} · ${t.dist}</div></button><button class="sub-btn ${t.my.subscribed?'on':''}" data-a="subscribe" data-id="${t.id}">${t.my.subscribed?'Вы подписаны':'Подписаться'}</button><button class="more" data-a="menu" data-id="${t.id}">⋯</button></div>`;
  return `<section class="card" data-card="${t.id}">
    <div class="media">
      <div class="slide" style="background-image:${f.url?`url('${f.url}')`:artSVG(f.art)}"></div>
      <div class="shade-top"></div><div class="shade-bot"></div>
      ${bars}
      <button class="tap-prev" data-a="frag" data-id="${t.id}" data-d="-1" aria-label="Предыдущий фрагмент"></button>
      <button class="tap-next" data-a="frag" data-id="${t.id}" data-d="1" aria-label="Следующий фрагмент"></button>
      <div class="tags-strip">${tags}</div>
      ${canAdd?'<div class="tags-fade"></div>':''}
      ${canAdd?`<button class="add-tag" data-a="addtag" data-id="${t.id}" aria-label="Добавить тег">+</button>`:''}
      ${author}
      <div class="overlay">${strengthHTML(t.strength,t.trend)}<div class="txt ${t.my.expanded?'full':''}" data-a="expand" data-id="${t.id}">${esc(f.text)}</div></div>
      <div class="rail"><button data-a="comments" data-id="${t.id}">${I.comment}<span>${t.comments}</span></button><div>${I.eye}<span>${t.views}</span></div></div>
    </div>
    ${actionsHTML(t)}
  </section>`;
}
function mtRow(t){
  return `<button class="mt" data-a="mt" data-id="${t.id}" style="width:100%;text-align:left"><span class="lbl">Money Trust</span><span class="val">${t.mt}</span><span class="bar"><i style="width:${t.mtOf}%"></i></span><span class="of">${t.mtOf} из 100 выбирают X3D</span><span class="info-i">i</span></button>`;
}
function actionsHTML(t){
  if (t.own){
    if (t.status==='finished') return `<div class="actions"><div class="box caption c-sec center">Тропа завершена · её раздали ${fmt(t.shares)} раз</div>${mtRow(t)}</div>`;
    return `<div class="actions"><div class="row" style="justify-content:space-between">
      <div><div class="strong">${fmt(t.shares)}</div><div class="caption c-mut">раздали</div></div>
      <div><div class="strong">${t.x3d}</div><div class="caption c-mut">бустов X3D</div></div>
      <button class="btn primary" style="width:auto;padding:0 18px;height:44px" data-a="addition" data-id="${t.id}">Дополнить Тропу</button></div>${mtRow(t)}</div>`;
  }
  const m = t.my;
  if (m.x3d){
    const x = m.x3d, pct = Math.round(100*(0.5*x.viewed/36 + 0.5*Math.min(1,x.fwd/6)));
    const cur = Math.round(x.max * (0.7 + 0.3*pct/100)), hrs = Math.max(0, 24 - Math.floor((Date.now()-x.at)/3600000));
    return `<div class="actions"><div class="part">
      <div class="top"><span class="strong">Ваше участие</span>${strengthHTML(t.strength,t.trend)}</div>
      <div class="top"><span class="heading">до ${fmt(x.max)} DEMOS</span><span class="caption c-sec">Ваш номер <b style="color:#fff">№${x.n}</b></span></div>
      <div class="top caption"><span class="c-sec">Результат буста · сейчас ${fmt(cur)} DEMOS</span><b>${pct}%</b></div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="caption c-mut">Посмотрели ${x.viewed} из 36 · раздали дальше ${x.fwd} из 6. Если все 36 посмотрят и 6 раздадут дальше — награда придёт сразу.</div>
      <div class="top caption"><span class="c-sec">Расчёт</span><b>${pct>=100?'сейчас':'через '+hrs+' ч'}</b></div>
    </div>${mtRow(t)}</div>`;
  }
  const shareBtn = m.shared ? '' : `<button class="btn secondary" data-a="share" data-id="${t.id}">${I.share}<span>Раздать</span><span class="cnt">${fmt(t.shares)}</span></button>`;
  return `<div class="actions"><div class="row">${shareBtn}<button class="btn x3d" data-a="x3d" data-id="${t.id}"><span>X3D · Буст</span><span class="cnt">${t.x3d}</span></button></div>${mtRow(t)}</div>`;
}
function refreshCard(id){
  const t = byId(id); const el = document.querySelector(`[data-card="${id}"]`); if(!t||!el) return;
  const sl = el.querySelector('.tags-strip'); const left = sl ? sl.scrollLeft : 0;
  const tmp = document.createElement('div'); tmp.innerHTML = cardHTML(t); const nw = tmp.firstElementChild;
  el.replaceWith(nw); const s2 = nw.querySelector('.tags-strip'); if(s2) s2.scrollLeft = left;
}

// ---------- экраны ----------
const SCREENS = {};

SCREENS.splash = () => `<div class="screen" style="justify-content:center;align-items:center" data-a="ob-next" data-to="ob1">
  <div style="display:flex;flex-direction:column;align-items:center;margin-top:-40px">${I.logo}<div class="wordmark" style="font-size:34px;margin-top:30px">DEMOS</div><div class="body" style="letter-spacing:.04em;margin-top:10px">Биржа правды</div></div>
  <div class="caption c-sec" style="position:absolute;bottom:calc(40px + var(--safe-bottom));font-size:12px">«Мнение без равной конкуренции ничего не стоит»</div></div>`;

const obSlide = (i, big, title, text, next) => `<div class="screen">
  <div style="display:flex;justify-content:flex-end;padding:8px 16px"><button class="caption c-sec" data-a="ob-next" data-to="terms">Пропустить</button></div>
  <div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:16px">
    <div style="height:220px;border-radius:24px;background:var(--bg-surface);display:grid;place-items:center"><div class="title" style="font-size:40px">${big}</div></div>
    <div class="title">${title}</div><div class="body c-sec">${text}</div></div>
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom));display:flex;flex-direction:column;gap:16px"><div class="dots"><i class="${i===1?'on':''}"></i><i class="${i===2?'on':''}"></i><i class="${i===3?'on':''}"></i></div><button class="btn primary" data-a="ob-next" data-to="${next}">Далее</button></div></div>`;
SCREENS.ob1 = () => obSlide(1,'108','Правду разносят люди','В DEMOS нет подписок на людей и поиска Троп. Новую Тропу сразу получают 108 человек рядом и по тегам, дальше — по 12 за каждое «Раздать». Важное доходит само.','ob2');
SCREENS.ob2 = () => obSlide(2,'12 → 36','X3D — буст для важного','Если Тропа важна, усильте её: X3D доставит её 36 людям вместо 12. Участники буста получают награду в DEMOS через сутки после покупки — она зависит от номера участника и результата буста.','terms');
SCREENS.terms = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:14px">
  <div class="title">Прежде чем начать</div>
  <div class="body c-sec">DEMOS работает по правилам: без подписок на людей, одна новая Тропа в день, опубликованные Тропы не удаляются, незаконный контент модерируется.</div>
  ${['Условия использования','Политика конфиденциальности','Правила сообщества'].map(x=>`<div class="kv"><span>${x}</span><span class="c-acc caption">Открыть</span></div>`).join('')}
  <div class="check ${S.params.ok?'on':''}" data-a="terms-check"><span class="bx"></span><span>Я принимаю Условия использования, Политику конфиденциальности и Правила сообщества</span></div></div>
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom))"><div class="dots" style="margin-bottom:16px"><i></i><i></i><i class="on"></i></div><button class="btn primary" data-a="ob-next" data-to="geo" ${S.params.ok?'':'disabled'}>Принять и продолжить</button></div></div>`;
SCREENS.geo = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:14px">
  <div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent);margin:0 0 8px">◎</div>
  <div class="title">Тропы рядом с вами</div>
  <div class="body c-sec">DEMOS работает от вашей точки на карте: Тропы приходят от неё — сначала самым ближним. Разрешите геолокацию или отметьте точку вручную. Другие видят только расстояние до Тропы, а не саму точку.</div></div>
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom));display:flex;flex-direction:column;gap:8px"><button class="btn primary" data-a="geo-allow">Разрешить геолокацию</button><button class="btn ghost" data-a="go" data-to="map">Отметить точку вручную</button></div></div>`;
SCREENS.map = () => `<div class="screen">${topbar('Где вы находитесь?')}
  <div class="map"><div class="road" style="left:0;right:0;top:30%;height:14px;transform:rotate(-8deg)"></div><div class="road" style="top:0;bottom:0;left:62%;width:12px;transform:rotate(12deg)"></div><div class="road" style="left:0;right:0;top:66%;height:8px"></div><div class="pin"><i></i></div></div>
  <div class="sheet" style="position:relative;animation:none;border-radius:20px 20px 0 0;margin-top:-20px"><div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
    <div><div class="heading">${esc(S.geo.label)}</div><div class="caption c-mut">Точность ${esc(S.geo.acc)}</div></div>
    <div class="body c-sec">DEMOS работает от вашей точки: Тропы приходят от неё — сначала самым ближним. Передвиньте карту, чтобы метка стояла точно там, где вы, и подтвердите.</div>
    <div class="caption c-mut">Другие пользователи вашу точку не видят — только расстояние до Тропы.</div></div>
    <div class="foot"><button class="btn primary" data-a="map-ok">Я нахожусь здесь</button><button class="btn ghost" data-a="geo-allow">Определить по геолокации</button></div></div></div>`;
SCREENS.tags1 = () => `<div class="screen">${topbar('','Шаг 1 из 2')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px">
  <div class="title">Выберите темы</div><div class="body c-sec">Мы отметили три популярные темы вашего города — снимите лишние или добавьте свои.</div>
  <div class="tag-grid">${TOPICS.map(x=>`<button class="chip ${S.topics.has(x)?'sub':''}" data-a="topic" data-v="${x}">${x}</button>`).join('')}</div>
  <div class="caption c-mut">Выберите хотя бы одну тему. Чем больше тем — тем живее лента</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="go" data-to="tags2" ${S.topics.size?'':'disabled'}>Далее</button></div></div>`;
SCREENS.tags2 = () => `<div class="screen">${topbar('','Шаг 2 из 2')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px">
  <div class="title">Уточните интересы</div><div class="body c-sec">Необязательно. Детальные теги делают ленту точнее.</div>
  ${[...S.topics].filter(x=>DETAILS[x]).map(x=>`<div class="strong" style="margin-top:6px">${x}</div><div class="tag-grid">${DETAILS[x].map(d=>`<button class="chip ${S.details.has(d)?'sub':''}" data-a="detail" data-v="${d}">${d}</button>`).join('')}</div>`).join('') || '<div class="c-mut caption">Для выбранных тем пока нет детальных тегов.</div>'}
  </div><div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="ob-finish">Начать</button></div></div>`;

// главный экран: лента / подписки / профиль
SCREENS.main = () => {
  if (S.tab==='profile') return profileHTML();
  const header = `<header class="app-header"><div class="wordmark">DEMOS</div><div class="tabs"><button class="tab ${S.feedTab==='trails'?'on':''}" data-a="feedtab" data-t="trails">Тропы</button><button class="tab ${S.feedTab==='subs'?'on':''}" data-a="feedtab" data-t="subs">Подписки</button></div></header>`;
  const body = S.feedTab==='trails' ? `<div class="feed" id="feed">${allTrails().map(t=>cardHTML(t)).join('')}</div>` : `<div class="scroll">${subsHTML()}</div>`;
  return `<div class="screen">${header}${body}${bottomNav()}</div>`;
};

function subsHTML(){
  const seg = `<div class="pad" style="padding-top:4px;padding-bottom:12px"><div class="seg"><button class="${S.subsTab==='trails'?'on':''}" data-a="substab" data-t="trails">Тропы</button><button class="${S.subsTab==='tags'?'on':''}" data-a="substab" data-t="tags">Теги</button></div></div>`;
  if (S.subsTab==='trails'){
    const list = S.trails.filter(t=>t.my.subscribed || t.my.x3d);
    return seg + `<div class="pad"><div class="caption c-mut" style="margin-bottom:6px">Чужие Тропы, на которые вы подписались (и те, где купили X3D). Ваши собственные Тропы — в профиле, «Мои Тропы».</div>
      ${list.length ? list.map(t=>`<button class="list-item" style="width:100%;text-align:left" data-a="open-trail" data-id="${t.id}"><div class="thumb" style="background-image:${artSVG(t.frags[0].art)}"></div><div style="flex:1;min-width:0"><div class="strong" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.frags[0].text)}</div><div class="caption c-mut">@${t.author} · ${t.ago}</div>${t.my.x3d?'<span class="badge acc" style="margin-top:4px">Вы в бусте</span>':''}</div></button>`).join('') : '<div class="empty">Пока нет подписок. Нажмите «Подписаться» на Тропе — сюда придут её дополнения.</div>'}</div>`;
  }
  const q = (S.params.q||'').trim().toLowerCase();
  const found = q ? POPULAR_TAGS.filter(t=>t[0].toLowerCase().includes(q)) : [];
  return seg + `<div class="pad" style="display:flex;flex-direction:column;gap:14px">
    <div class="field"><input id="tagsearch" placeholder="Найти тег" value="${esc(S.params.q||'')}" data-input="tagsearch"></div>
    ${q ? `<div class="tag-grid">${found.map(t=>chipHTML([t[0],t[1],0])).join('') || '<span class="caption c-mut">Ничего не нашли</span>'}</div>` : ''}
    <div class="caption c-mut">Нажмите на тег, чтобы подписаться или отписаться. Белая рамка — вы подписаны.</div>
    <div class="strong">Ваши теги · ${S.subs.size}</div><div class="tag-grid">${[...S.subs].map(x=>chipHTML([x,(POPULAR_TAGS.find(p=>p[0]===x)||[0,''])[1],0])).join('')}</div>
    <div class="strong">Популярные рядом</div><div class="tag-grid">${POPULAR_TAGS.filter(p=>!S.subs.has(p[0])).map(p=>chipHTML([p[0],p[1],0])).join('')}</div>
    <div class="caption c-mut" style="padding-bottom:20px">Новые теги появляются, когда их добавляют к Тропам авторы и зрители.</div></div>`;
}

function profileHTML(){
  const head = `<div class="pad" style="padding-top:16px;display:flex;flex-direction:column;gap:12px">
    <div><div class="title">@marsaon</div><div class="caption c-sec">Москва · Ваши соцсети: 2</div></div>
    <div style="display:flex;gap:8px"><button class="btn secondary" style="height:38px;font-size:14px" data-a="go" data-to="about">О DEMOS</button><button class="btn secondary" style="height:38px;font-size:14px" data-a="go" data-to="edit">Изменить</button><button class="btn secondary" style="height:38px;font-size:14px" data-a="go-subs">Подписки</button></div>
    <div class="seg"><button class="${S.profileTab==='trails'?'on':''}" data-a="proftab" data-t="trails">Мои Тропы</button><button class="${S.profileTab==='wallet'?'on':''}" data-a="proftab" data-t="wallet">Кошелёк</button></div></div>`;
  const body = S.profileTab==='trails' ? myTrailsHTML() : walletHTML();
  return `<div class="screen"><div class="scroll">${head}${body}</div>${bottomNav()}</div>`;
}
function myTrailsHTML(){
  return `<div class="pad">${S.myTrails.map(t=>`<div class="list-item"><button class="thumb" style="background-image:${artSVG(t.frags[0].art)}" data-a="open-trail" data-id="${t.id}"></button>
    <div style="flex:1;min-width:0" data-a="open-trail" data-id="${t.id}"><div class="strong" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.frags[0].text)}</div>
    <div style="margin-top:4px">${t.status==='finished'?'<span class="badge mut">Тропа завершена</span>':strengthHTML(t.strength,t.trend)}</div>
    <div class="caption c-sec">${fmt(t.shares)} раздали · ${t.x3d} X3D · ${t.mt} Money Trust</div></div>
    ${t.status==='active'?`<button class="badge acc" style="height:30px" data-a="addition" data-id="${t.id}">Дополнить</button>`:''}</div>`).join('')}
    <div class="caption c-mut" style="padding:14px 0 24px">Свои Тропы — только здесь. В «Подписках» — чужие Тропы.</div></div>`;
}
function walletHTML(){
  const w = S.wallet;
  return `<div class="pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
    <div class="box"><div class="caption c-sec">Доступно</div><div style="display:flex;align-items:baseline;gap:6px"><span class="title">${fmt(w.available)}</span><span class="c-sec">DEMOS</span></div>
      <button class="btn primary" style="margin-top:10px" data-a="go" data-to="withdraw" ${w.available<300?'disabled':''}>Вывести</button></div>
    <div class="box"><div style="display:flex;justify-content:space-between"><span class="caption c-sec">В разблокировке</span><span class="strong">${fmt(w.vesting)} DEMOS</span></div>
      <div class="caption c-mut" style="margin-top:4px">${w.vesting?`Каждый день открывается ещё ${fmt(w.perDay)} DEMOS · осталось ${w.daysLeft} дней`:'Всё разблокировано'}</div>
      ${w.vesting?'<button class="caption c-acc" style="margin-top:8px" data-a="claim-all">Забрать всё сейчас →</button>':''}</div>
    <div class="box" style="display:flex;justify-content:space-between;align-items:center"><span class="caption">${w.ton?'TON-кошелёк '+w.ton:'TON-кошелёк не подключён'}</span><button class="caption c-acc" data-a="ton">${w.ton?'Отключить':'Подключить'}</button></div>
    <div class="strong" style="margin-top:6px">Мои X3D</div>
    ${S.myX3d.map(x=>`<div class="kv"><div><div class="strong">${esc(x.title)}</div><div class="caption c-mut">${x.info}</div></div><div style="text-align:right"><span class="badge ${x.st==='Активна'?'acc':'suc'}">${x.st}</span><div class="caption c-sec">${x.rew}</div></div></div>`).join('')}
    <div class="strong" style="margin-top:6px">Вы как автор</div>
    <div class="kv"><div><div>Получено от зрителей</div><div class="caption c-mut">за 30 дней · растёт сразу</div></div><span class="strong">3 260 DEMOS</span></div>
    <div class="kv"><div><div>Вас поблагодарили</div><div class="caption c-mut">разово, за ваши Тропы</div></div><span class="strong">37 человек</span></div>
    <div class="box" style="margin-top:6px"><div class="strong">Пригласите друзей</div><div class="caption c-sec" style="margin:4px 0 8px">3% от каждого их буста X3D — вам в TON, сразу. Действует 6 месяцев с момента, как друг пришёл по ссылке.</div>
      <div class="caption c-sec">Приглашено 4 · получено 12,6 TON</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">t.me/demos_bot?start=marsaon</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`;
}

SCREENS.trail = () => { const t = byId(S.params.id); return `<div class="screen">${topbar(t.own?'Ваша Тропа':'Тропа')}<div class="feed">${cardHTML(t)}</div></div>`; };

SCREENS.withdraw = () => `<div class="screen">${topbar('Вывод DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px">
  <div class="box center" style="padding:24px"><div class="title" style="font-size:36px">${fmt(S.wallet.available)}</div><div class="caption c-sec">DEMOS · всё доступное</div></div>
  <div class="kv"><span class="k">Вам на кошелёк</span><span class="v">${fmt(S.wallet.available)} DEMOS</span></div>
  <div class="kv"><span class="k">Кошелёк</span><span class="v">${S.wallet.ton||'не подключён'}</span></div>
  <div class="caption c-mut">Сеть TON возьмёт около 0,05 TON. Минимальная сумма вывода — 300 DEMOS.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="withdraw-do">${S.wallet.ton?'Вывести':'Подключить кошелёк'}</button></div></div>`;

SCREENS.about = () => `<div class="screen">${topbar('О DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:18px;padding-bottom:24px">
  <div class="title" style="font-size:26px;line-height:1.3;margin:10px 0">Правда —<br>это мнение, выдержавшее<br>равную конкуренцию</div>
  ${[['Равный старт','Любую новую Тропу сразу получают 108 человек рядом и по тегам, дальше — по 12 за каждое «Раздать». Неважно, кто автор и сколько у него знакомых.'],['Никаких подписчиков','Нет поиска людей и Троп, нет подписок на людей. Тропа расходится, только если её раздают.'],['Цену назначают люди','«Раздать» — голос бесплатно. X3D — голос, за который человек платит, расширяя охват до 36.'],['Одна новая Тропа в день','Создать новую можно раз в сутки — лента не заваливается. А дополнять свою Тропу можно сколько угодно: история развивается.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="body c-sec">${b[1]}</div></div>`).join('')}
  <div>${['Как считается награда X3D','Условия использования','Политика конфиденциальности'].map((x,i)=>`<button class="kv" style="width:100%" ${i===0?'data-a="go" data-to="reward"':''}><span>${x}</span><span class="c-mut">›</span></button>`).join('')}</div>
  <button class="btn secondary" data-a="reset">Пройти онбординг заново</button>
  <div class="caption c-mut center">DEMOS · версия 0.1 · тестовые данные</div></div></div>`;

SCREENS.reward = () => `<div class="screen">${topbar('Как считается награда X3D')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="body c-sec">X3D — это покупка буста: Тропу увидят ещё 36 человек. Награда в DEMOS — за то, что вы помогли Тропе разойтись. Это не обещание дохода.</div>
  ${[['1. Оплата','Сбор сервиса 8% уже включён в сумму. Остальные 92% автоматически покупают DEMOS на бирже.'],['2. Ваш номер','Фиксируется в момент оплаты. Чем раньше вы поддержали Тропу, тем больше возможная награда.'],['3. Цена DEMOS','Берётся средняя за последние 15 минут и фиксируется при оплате. Цифры в окне оплаты действуют 60 секунд.'],['4. Из чего награда','70% — за ваш номер. 30% — за результат буста: сколько из 36 человек посмотрели Тропу и сколько из них раздали её дальше (максимум засчитывается при 6).'],['5. Минимум','Не меньше 30% суммы оплаты в DEMOS по зафиксированной цене. В TON это может быть меньше, если цена DEMOS упадёт.'],['6. Когда расчёт','Через 24 часа после оплаты — или раньше, если результат буста дошёл до 100%. Если Тропа завершилась раньше — в момент завершения.'],['7. Выплата','30% сразу, остальное равномерно за 7 дней. Можно забрать всё сразу — с удержанием от 30% в первый день до 0% на седьмой.'],['8. Дневной лимит','Награды выдаются из резерва с дневным лимитом. Если за день наград больше лимита, их уменьшают — но не ниже минимума.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="caption c-sec">${b[1]}</div></div>`).join('')}</div></div>`;

SCREENS.edit = () => `<div class="screen">${topbar('Изменить профиль')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:20px">
  <div><div class="caption c-sec">Никнейм</div><div class="field" style="display:flex;justify-content:space-between"><span>@marsaon</span><span>🔒</span></div><div class="caption c-mut">Уникальный. Его видят все вместо имени и аватарки.</div></div>
  <div><div class="caption c-sec">Город</div><button class="field" style="width:100%;text-align:left" data-a="go" data-to="map">Москва</button><div class="caption c-mut">По вашей точке на карте. Нажмите, чтобы изменить точку.</div></div>
  <div><div class="caption c-sec">О себе</div><div class="field"><textarea maxlength="160" style="min-height:70px">Пишу о том, что происходит в Хамовниках и вокруг. Без фейков.</textarea></div></div>
  <div><div class="caption c-sec">Соцсети</div><div class="caption c-mut" style="margin-bottom:6px">Видны всем, кто нажмёт на ваш ник. Добавляются ссылкой.</div>
  ${[['Telegram','@marsaon'],['Instagram','@marsaon.msk'],['YouTube',''],['VK',''],['TikTok','']].map(s=>`<div class="kv"><span>${s[0]}</span>${s[1]?`<span class="c-acc">${s[1]}</span>`:'<button class="c-acc caption" data-a="toast" data-m="Вставьте ссылку на профиль — ник подтянется сам">Добавить</button>'}</div>`).join('')}</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="saved">Сохранить</button></div></div>`;

// создание Тропы
SCREENS.create1 = () => { const d = S.draft; const media = d.media.length;
  return `<div class="screen">${topbar('Новая Тропа','1/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:16px">
  <label class="box" style="height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background-size:cover;background-position:center;${media?`background-image:url('${d.media[0].url}')`:''};position:relative;cursor:pointer">
    <input type="file" accept="image/*,video/*" multiple data-input="media" style="display:none">
    ${media?`<span class="badge mut" style="position:absolute;top:10px;right:10px">${d.media[0].kind==='video'?(d.media[0].dur+' из 3:00'):media+' фото'}</span><span class="badge acc" style="position:absolute;bottom:10px;right:10px">Заменить</span>`:'<div style="font-size:30px">+</div><div class="strong">Видео или фото</div>'}
  </label>
  ${media?'':'<button class="caption c-acc" data-a="demo-media">Взять пример для теста</button>'}
  <div class="caption c-mut">Видео до 3 минут или до 10 фото</div>
  <div><div style="display:flex;justify-content:space-between"><span class="caption c-sec">Текст</span><span class="caption c-mut" id="cnt">${d.text.length}/1200</span></div>
  <div class="field"><textarea maxlength="1200" data-input="text" placeholder="Что происходит? Без заголовка — просто расскажите.">${esc(d.text)}</textarea></div></div>
  <div class="caption c-sec">📍 Москва, Хамовники · определено автоматически</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="go" data-to="create2" ${media&&d.text.trim()?'':'disabled'} id="next1">Далее</button></div></div>`; };
SCREENS.create2 = () => { const d = S.draft; const q=(S.params.q||'').trim();
  const list = POPULAR_TAGS.filter(t=>!q || t[0].toLowerCase().includes(q.toLowerCase()));
  return `<div class="screen">${topbar('Новая Тропа','2/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:16px">
  <div class="title">Выберите теги</div><div class="body c-sec">От 1 до 3 тегов. Тропу сразу получат подписчики этих тегов и люди рядом с вами. Другие люди смогут добавить к ней другие теги.</div>
  <div class="field"><input placeholder="Найти или создать тег" value="${esc(q)}" data-input="ctag"></div>
  ${d.tags.length?`<div class="tag-grid">${d.tags.map(t=>`<button class="chip sub" data-a="ctag" data-v="${esc(t)}">${esc(t)} ✕</button>`).join('')}</div>`:''}
  <div class="tag-grid">${list.filter(t=>!d.tags.includes(t[0])).map(t=>`<button class="chip" data-a="ctag" data-v="${esc(t[0])}">${t[0]} <span class="n">${t[1]}</span></button>`).join('')}</div>
  ${q && !POPULAR_TAGS.some(t=>t[0].toLowerCase()===q.toLowerCase()) ? `<button class="btn secondary" data-a="ctag" data-v="${esc(q)}">Создать тег «${esc(q)}»</button>`:''}
  <div class="caption c-mut">Выбрано ${d.tags.length} из 3</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="go" data-to="create3" ${d.tags.length?'':'disabled'}>Далее</button></div></div>`; };
SCREENS.create3 = () => { const d=S.draft;
  return `<div class="screen">${topbar('Превью','3/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:16px">
  <div style="height:340px;border-radius:16px;position:relative;overflow:hidden;background:#000 center/cover;background-image:url('${d.media[0].url}')">
    <div class="shade-bot" style="position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(transparent,rgba(0,0,0,.8))"></div>
    <div style="position:absolute;top:12px;left:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap">${d.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
    <div style="position:absolute;top:56px;left:12px"><div class="strong">@marsaon</div><div class="caption" style="color:rgba(255,255,255,.75)">только что · рядом</div></div>
    <div style="position:absolute;left:12px;right:12px;bottom:12px" class="body">${esc(d.text.slice(0,180))}${d.text.length>180?'… ещё':''}</div></div>
  <div class="caption c-sec">Сразу после публикации Тропу получат люди рядом с вами и подписчики выбранных тегов.</div>
  <div class="box caption c-warn" style="background:var(--bg-warning-soft)">Важно: опубликованную Тропу нельзя удалить или изменить. Она исчезает сама, когда после последней бесплатной раздачи прошло 24 часа. Дополнять можно сколько угодно, не чаще раза в минуту. Новая Тропа — одна в сутки.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="publish-ask">Опубликовать Тропу</button></div></div>`; };
SCREENS.limit = () => `<div class="screen">${topbar('Новая Тропа')}<div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:12px;text-align:center">
  <div class="icon-circle" style="background:var(--bg-raised)">⏳</div><div class="title">Сегодня вы уже создали новую Тропу</div>
  <div class="body c-sec">Следующую новую можно создать через ${limitLeft()}. А дополнять сегодняшнюю — сколько угодно, не чаще раза в минуту.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="addition" data-id="${(S.myTrails.find(t=>t.fresh)||S.myTrails[0]).id}">Дополнить сегодняшнюю Тропу</button></div></div>`;
function limitLeft(){ const ms = (S.createdAt||Date.now()) + 86400000 - Date.now(); const h=Math.floor(ms/3600000), m=Math.floor(ms%3600000/60000); return `${h}:${String(m).padStart(2,'0')}`; }
SCREENS.addition = () => { const t = byId(S.params.id); const wait = Math.max(0, 60 - Math.floor((Date.now()-S.lastAddAt)/1000));
  return `<div class="screen">${topbar('Дополнить Тропу')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:16px">
  <div class="list-item" style="border:0"><div class="thumb" style="background-image:${artSVG(t.frags[0].art)}"></div><div><div class="strong">${esc(t.frags[0].text.slice(0,60))}…</div><div class="caption c-mut">Ваша Тропа · ${t.frags.length} фрагмента</div></div></div>
  <label class="box" style="display:flex;align-items:center;gap:12px;cursor:pointer"><input type="file" accept="image/*,video/*" style="display:none" data-input="addmedia"><span class="icon-circle" style="width:44px;height:44px;margin:0;background:var(--bg-accent-soft);color:var(--t-accent)">+</span><span><span class="strong">Видео до 3 минут или фото</span><br><span class="caption c-mut">${S.params.added?'Файл выбран':'Снять сейчас или выбрать из галереи'}</span></span></label>
  <div class="field"><textarea maxlength="1200" data-input="addtext" placeholder="Что нового?"></textarea></div>
  <div class="caption c-mut">Дополнение станет новым фрагментом Тропы — у зрителей появится новая полоска сверху. Подписчики Тропы получат уведомление. Дополнять можно сколько угодно раз, не чаще раза в минуту.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="addition-do" data-id="${t.id}" ${wait?'disabled':''}>${wait?`Следующее дополнение через 0:${String(wait).padStart(2,'0')}`:'Дополнить Тропу'}</button></div></div>`; };

// ---------- листы ----------
function openSheet(name, params={}){ document.querySelectorAll('.toast').forEach(n=>n.remove()); S.sheet = {name, params}; renderSheet(); haptic(); }
function closeSheet(){ S.sheet = null; renderSheet(); }
const SHEETS = {};
function x3dCalc(t, a){ const n = t.x3d + 1, coef = 0.3 + 2.7*Math.exp(-(n-1)/30); return {n, max:a*coef*300, min:a*0.3*300}; }
SHEETS.x3d = p => { const t = byId(p.id); const valid = !p.other || (p.amount>=1 && p.amount<=100); const a = valid ? (p.amount || 5) : 0; const {n, max, min} = x3dCalc(t, a);
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div style="display:flex;justify-content:space-between;align-items:center"><div class="heading">Буст Тропы</div>${strengthHTML(t.strength,t.trend)}</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам</div>
   <div class="center" style="padding:6px 0"><span class="title" style="font-size:40px" id="x3d-big">${a||'—'}</span> <span class="c-sec">TON</span></div>
   ${p.other?`<div class="field" style="display:flex;gap:8px;align-items:center"><input id="x3d-other-in" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="Своя сумма" value="${esc(p.otherVal||'')}" data-input="x3d-other"><span class="c-sec">TON</span></div><div class="caption ${valid?'c-mut':'c-warn'}" id="x3d-err">От 1 до 100 TON, целым числом</div>`:''}
   <div class="amounts">${[1,5,20].map(v=>`<button class="amt ${a===v?'on':''}" data-a="x3d-amt" data-v="${v}">${v} TON</button>`).join('')}<button class="amt ${[1,5,20].includes(a)&&!p.other?'':'on'}" data-a="x3d-other">Другая</button></div>
   <div><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">Вы будете</span><span class="v">${n}-м</span></div><div class="kv"><span class="k">Награда</span><span class="v" id="x3d-max">до ${fmt(max)} DEMOS</span></div><div class="kv"><span class="k">Минимум</span><span class="v" id="x3d-min">${fmt(min)} DEMOS</span></div><div class="kv"><span class="k">Сбор сервиса</span><span class="v">8%, уже включён</span></div></div>
   <div class="caption c-mut">Номер фиксируется в момент оплаты. Награда в DEMOS — через 24 часа или раньше, если все 36 посмотрят Тропу и 6 раздадут её дальше. При превышении дневного лимита может быть уменьшена, но не ниже минимума. Цена DEMOS не гарантируется.</div>
   <button class="caption c-acc" style="text-align:left" data-a="go" data-to="reward">Как считается награда →</button>
   ${S.residentDone?'':`<div class="check ${S.residentOk?'on':''}" data-a="resident"><span class="bx"></span><span>Я не резидент стран из списка ограничений</span></div>`}</div>
   <div class="foot"><button class="btn primary" id="x3d-pay" data-a="x3d-pay" data-id="${t.id}" ${(S.residentOk||S.residentDone)&&valid?'':'disabled'}>${valid?`Оплатить ${a} TON`:'Введите сумму'}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.paying = p => `<div class="grab"></div><div class="sc center" style="padding-top:10px"><div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">⌛</div><div class="heading">Подтвердите в кошельке</div><div class="caption c-sec" style="margin:6px 0 16px">Откройте кошелёк и подтвердите оплату ${p.amount} TON. В тестовой версии оплата пройдёт сама.</div></div>`;
SHEETS.boosted = p => { const t = byId(p.id), x = t.my.x3d;
  return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">✓</div><div class="heading">Вы в бусте!</div>
   <div class="caption c-sec">Вы ${x.n}-й участник. Тропу увидят ещё 36 человек рядом с вами и по тегам. Вы подписаны на Тропу — пришлём её дополнения.</div>
   <div style="text-align:left"><div class="kv"><span class="k">Награда</span><span class="v">до ${fmt(x.max)} DEMOS</span></div><div class="kv"><span class="k">Минимум</span><span class="v">${fmt(x.min)} DEMOS</span></div><div class="kv"><span class="k">Расчёт</span><span class="v">через 24 ч или раньше</span></div></div></div>
   <div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
SHEETS.mt = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Money Trust</div><div class="body c-sec">Показывает, насколько люди готовы платить за охват этой Тропы.</div>
   <div class="box"><div class="title">${t.mt}</div><div class="caption c-sec">Сколько всего заплатили за X3D этой Тропы.</div></div>
   <div class="box"><div class="strong">${t.mtOf} из 100 выбирают X3D</div><div style="display:grid;grid-template-columns:repeat(20,1fr);gap:4px;margin:10px 0">${Array.from({length:100},(_,i)=>`<i style="aspect-ratio:1;border-radius:50%;background:${i<t.mtOf?'var(--t-accent)':'var(--bg-raised-hover)'}"></i>`).join('')}</div>
   <div class="caption c-sec">Считаем, сколько из 100 человек, раздавших Тропу бесплатно, перешли на платную раздачу X3D. Здесь — ${t.mtOf}.</div>
   <div class="caption c-mut" style="margin-top:6px">X3D включает в себя бесплатную раздачу, поэтому каждый, кто купил X3D, уже входит в эти 100. Один человек считается один раз.</div></div></div>
   <div class="foot"><button class="btn secondary" data-a="close">Понятно</button></div>`; };
SHEETS.comments = p => { const t = byId(p.id);
  const one = (c, reply) => `<div class="comment ${reply?'reply':''}"><div class="caption"><b>@${c.who}</b> <span class="c-mut">${c.ago}</span></div><div class="body">${esc(c.text)}</div>
    <div class="caption" style="display:flex;gap:14px">${reply?'':`<button class="c-sec" data-a="reply" data-v="${c.id}" data-who="${c.who}">Ответить</button>`}${c.who==='marsaon'?`<button class="c-dan" data-a="del-comment" data-v="${c.id}">Удалить</button>`:''}</div></div>`;
  return `<div class="grab"></div><div class="sc"><div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px"><div class="heading">Комментарии ${t.comments}</div><span class="caption c-mut">Сначала новые</span></div>
   ${S.comments.map(c=>one(c)+c.replies.map(r=>one(r,true)).join('')).join('')}<div class="caption c-mut" style="padding:8px 0">Удалить можно только свой комментарий.</div></div>
   <div class="foot">${S.replyTo?`<div class="caption c-sec" style="display:flex;justify-content:space-between">Ответ @${S.replyTo.who}<button data-a="reply-cancel">✕</button></div>`:''}
   <div style="display:flex;gap:8px"><div class="field" style="flex:1;padding:10px 12px"><input id="cmt" placeholder="${S.replyTo?'Написать ответ…':'Написать комментарий'}"></div><button class="btn primary" style="width:48px" data-a="send-comment" data-id="${t.id}">↑</button></div></div>`; };
SHEETS.author = p => { const t = byId(p.id), a = AUTHORS[t.author] || {city:'Москва',about:'',socials:[]};
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
   <div><div class="heading">@${t.author}</div><div class="caption c-sec">${a.city}</div></div><div class="body">${esc(a.about)}</div>
   ${a.socials.length?`<div class="caption c-mut" style="margin-top:4px">Соцсети автора</div>${a.socials.map(s=>`<button class="kv" style="width:100%;text-align:left" data-a="link" data-v="${s[2]}"><span><span class="strong">${s[0]} · ${s[1]}</span></span><span class="c-acc">›</span></button>`).join('')}`:''}</div>
   <div class="foot">${t.my.thanked?'<div class="caption c-mut center">Вы уже поблагодарили автора за эту Тропу</div>':`<button class="btn primary" data-a="sheet" data-s="thank" data-id="${t.id}">Поблагодарить автора</button>`}</div>`; };
SHEETS.thank = p => { const t = byId(p.id), v = p.v;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px"><div class="heading">Поблагодарить @${t.author}</div>
   <div class="caption c-sec">Из доступных ${fmt(S.wallet.available)} DEMOS. Сколько отправите — столько автор и получит.</div>
   <div class="amounts">${[50,100,250].map(x=>`<button class="amt ${v===x?'on':''}" style="${x===100&&v!==100?'border-color:var(--b-accent)':''}" data-a="thank-v" data-id="${t.id}" data-v="${x}">${x}</button>`).join('')}<button class="amt" data-a="toast" data-m="В рабочей версии — ввод своей суммы">Своя</button></div>
   <div class="caption c-acc">100 DEMOS — рекомендуемая сумма</div></div>
   <div class="foot"><button class="btn primary" data-a="thank-send" data-id="${t.id}" ${v?'':'disabled'}>${v?`Отправить ${v} DEMOS`:'Отправить'}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.thanked = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">♥</div><div class="heading">Спасибо, что поблагодарили</div><div class="caption c-sec">@${t.author} получил ${p.v} DEMOS за эту Тропу.</div>
   <div class="box" style="text-align:left"><div class="kv"><span class="k">Поблагодарили за эту Тропу</span><span class="v">38 человек</span></div><div class="kv"><span class="k">Всего благодарностей</span><span class="v c-suc">12 896 DEMOS</span></div></div>
   <div class="caption c-mut">Поблагодарить за одну Тропу можно один раз — кнопки больше не появятся.</div></div><div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
SHEETS.menu = p => { const t = byId(p.id);
  if (t.own) return `<div class="grab"></div><div class="sc"><button class="kv" style="width:100%" data-a="addition" data-id="${t.id}"><span>Дополнить Тропу</span><span>›</span></button><div class="caption c-mut" style="padding:10px 0">Опубликованную Тропу нельзя удалить или изменить. Она исчезает сама, когда после последней бесплатной раздачи прошло 24 часа.</div></div><div class="foot"><button class="btn ghost" data-a="close">Закрыть</button></div>`;
  return `<div class="grab"></div><div class="sc"><button class="kv" style="width:100%" data-a="sheet" data-s="report" data-id="${t.id}"><span class="c-dan">Пожаловаться</span><span>›</span></button></div><div class="foot"><button class="btn ghost" data-a="close">Закрыть</button></div>`; };
SHEETS.report = p => `<div class="grab"></div><div class="sc"><div class="heading">Пожаловаться на Тропу</div><div class="caption c-sec" style="margin:4px 0 8px">Жалобы проверяют модераторы. Автор не узнает, кто пожаловался.</div>
   ${['Незаконный контент','Насилие или угрозы','Мошенничество','Заведомая ложь, выдаваемая за факт','Личные данные без согласия','Спам или реклама','Другое'].map(r=>`<button class="kv" style="width:100%" data-a="report-do"><span>${r}</span><span class="c-mut">›</span></button>`).join('')}
   <div class="caption c-mut" style="padding:10px 0">Несогласие с мнением — не повод для жалобы. Для этого есть комментарии.</div></div>`;
SHEETS.addtag = p => { const t = byId(p.id), q = (p.q||'').trim();
  const sugg = POPULAR_TAGS.filter(x=>!t.tags.some(y=>y[0]===x[0]) && (!q || x[0].toLowerCase().includes(q.toLowerCase()))).slice(0,6);
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px"><div class="heading">Добавить тег к Тропе</div>
   <div class="caption c-sec">Можно добавить один тег — после того, как досмотрели Тропу. Тропу сразу получат ещё 8 человек: ближайшие к вам подписчики этого тега.</div>
   <div class="field" style="display:flex;gap:6px"><span class="c-mut">#</span><input id="addtag-q" placeholder="тег" value="${esc(q)}" data-input="addtag-q"></div>
   <div class="caption c-mut">Похожие теги</div><div class="tag-grid">${sugg.map(x=>`<button class="chip" data-a="addtag-do" data-id="${t.id}" data-v="${esc(x[0])}">${x[0]} <span class="n">${x[1]}</span></button>`).join('')}</div>
   ${q && !POPULAR_TAGS.some(x=>x[0].toLowerCase()===q.toLowerCase())?`<button class="btn secondary" data-a="addtag-do" data-id="${t.id}" data-v="${esc(q)}">+ Создать тег «${esc(q)}»</button>`:''}
   <div class="caption c-mut">Уже у Тропы: ${t.tags.map(x=>x[0]).join(', ')}</div></div>`; };
SHEETS.alltags = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc"><div class="heading">Теги Тропы · ${t.tags.length}</div>${t.tags.map(x=>`<div class="kv"><span>${chipHTML(x)}</span><span class="caption c-mut">${x[2]?'добавил зритель':'автор'}</span></div>`).join('')}</div>`; };
SHEETS.firstTrail = () => `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">1</div><div class="heading center">Ваша первая Тропа</div>
   ${['Её сразу получат 108 человек — рядом с вами и по вашим тегам.','Дальше она идёт, только если её раздают. Сколько она проживёт — не знает никто.','Опубликованную Тропу нельзя удалить или изменить — только дополнять. Она исчезает сама, когда после последней бесплатной раздачи прошло 24 часа.','Новая Тропа — одна в сутки; дополнять можно сколько угодно, не чаще раза в минуту. Видео до 3 минут, текст до 1200 знаков, от 1 до 3 тегов.'].map(x=>`<div class="body c-sec">• ${x}</div>`).join('')}</div>
   <div class="foot"><button class="btn primary" data-a="first-ok">Понятно</button></div>`;
SHEETS.publish = p => `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-warning-soft);color:var(--t-warning)">!</div><div class="heading center">Тропу нельзя будет удалить</div>
   ${['После публикации Тропу нельзя удалить и нельзя изменить текст или фото.','Тропа удаляется только сама, когда заканчивается её жизнь — через 24 часа после последней бесплатной раздачи.','Можно только дополнять новыми фрагментами — сколько угодно, не чаще раза в минуту.','Её сразу получат 108 человек, и она будет расходиться, пока её раздают.'].map(x=>`<div class="body c-sec">• ${x}</div>`).join('')}
   <div class="check ${p.ok?'on':''}" data-a="publish-check"><span class="bx"></span><span>Понимаю: Тропу нельзя удалить</span></div></div>
   <div class="foot"><button class="btn primary" data-a="publish-do" ${p.ok?'':'disabled'}>Опубликовать Тропу</button><button class="btn ghost" data-a="close">Вернуться и проверить</button></div>`;
SHEETS.published = () => `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">✓</div><div class="heading">Тропа опубликована</div><div class="body c-sec">Её уже получают 108 человек — рядом с вами и по выбранным тегам. Дальше она пойдёт, если её будут раздавать.</div></div>
   <div class="foot"><button class="btn primary" data-a="see-mine">Посмотреть</button></div>`;
SHEETS.claim = () => `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px"><div class="heading">Забрать всё сейчас?</div><div class="caption c-sec">В разблокировке ${fmt(S.wallet.vesting)} DEMOS, осталось ${S.wallet.daysLeft} дней.</div>
   <div class="box"><div style="display:flex;justify-content:space-between"><span class="strong">Подождать ${S.wallet.daysLeft} дней</span><span class="strong">${fmt(S.wallet.vesting)}</span></div><div class="caption c-mut">По ${fmt(S.wallet.perDay)} DEMOS в день, без удержаний</div></div>
   <div class="box"><div style="display:flex;justify-content:space-between"><span class="strong">Забрать сейчас</span><span class="strong">4 579</span></div><div class="caption c-warn">Удержание 21% · 1 249 DEMOS</div></div>
   <div class="caption c-mut">Удержание уменьшается каждый день: 30% в первый день, 0% на седьмой.</div></div>
   <div class="foot"><button class="btn secondary" data-a="close">Подождать</button><button class="btn ghost" data-a="claim-do">Забрать 4 579 DEMOS сейчас</button></div>`;

// ---------- рендер ----------
function render(forward){
  const feed = document.getElementById('feed'); if (feed && S._lastScreen==='main') S.feedTop = feed.scrollTop;
  const html = SCREENS[S.screen] ? SCREENS[S.screen]() : '';
  $app.innerHTML = html;
  const scr = $app.querySelector('.screen'); if (scr && forward) scr.classList.add('anim-in');
  const f2 = document.getElementById('feed'); if (f2 && S.screen==='main' && S.feedTop) f2.scrollTop = S.feedTop;
  S._lastScreen = S.screen;
  renderSheet(); syncBackButton();
}
function renderSheet(){
  $app.querySelectorAll('.dim,.sheet.float').forEach(n=>n.remove());
  if (S.sheet && SHEETS[S.sheet.name]){
    const d = document.createElement('div'); d.className='dim'; d.dataset.a='close';
    const s = document.createElement('div'); s.className='sheet float'; s.innerHTML = SHEETS[S.sheet.name](S.sheet.params);
    $app.appendChild(d); $app.appendChild(s);
  }
  syncBackButton();
}

// ---------- действия ----------
const A = {};
A.back = () => back();
A.close = () => closeSheet();
A.go = el => go(el.dataset.to, {});
A['ob-next'] = el => go(el.dataset.to, {}, false);
A['terms-check'] = () => { S.params.ok = !S.params.ok; render(false); };
A['geo-allow'] = () => {
  const done = (lat,lon) => { if(lat) S.geo = {label:`Ваша точка · ${lat.toFixed(4)}, ${lon.toFixed(4)}`, acc:'по GPS'}; go('map', {}, S.screen!=='map'); };
  try{
    if (tg && tg.LocationManager){ tg.LocationManager.init(()=>{ if (tg.LocationManager.isLocationAvailable) tg.LocationManager.getLocation(l=> l?done(l.latitude,l.longitude):done()); else done(); }); return; }
    if (navigator.geolocation){ navigator.geolocation.getCurrentPosition(p=>done(p.coords.latitude,p.coords.longitude), ()=>done(), {timeout:6000}); return; }
  }catch(e){}
  done();
};
A['map-ok'] = () => { if (S.onboarded){ toast('Точка сохранена'); back(); } else go('tags1', {}, false); };
A.topic = el => { const v = el.dataset.v; S.topics.has(v)?S.topics.delete(v):S.topics.add(v); render(false); };
A.detail = el => { const v = el.dataset.v; S.details.has(v)?S.details.delete(v):S.details.add(v); render(false); };
A['ob-finish'] = () => { S.onboarded = true; store.set('onboarded', true); [...S.topics, ...S.details].forEach(x=>S.subs.add(x)); store.set('subs',[...S.subs]); S.stack=[]; S.screen='main'; S.tab='feed'; render(true); };
A.nav = el => home(el.dataset.t);
A.feedtab = el => { S.feedTab = el.dataset.t; render(false); };
A.substab = el => { S.subsTab = el.dataset.t; render(false); };
A.proftab = el => { S.profileTab = el.dataset.t; render(false); };
A['go-subs'] = () => { S.tab='feed'; S.feedTab='subs'; S.stack=[]; S.screen='main'; render(true); };
A.frag = el => { const t = byId(el.dataset.id); const n = t.my.frag + (+el.dataset.d);
  if (n<0) return; if (n>=t.frags.length){ return; } t.my.frag = n; t.my.seen.add(n); t.my.expanded=false; refreshCard(t.id); };
A.expand = el => { const t = byId(el.dataset.id); t.my.expanded = !t.my.expanded; refreshCard(t.id); };
A.tag = el => { const v = el.dataset.tag; const on = !S.subs.has(v); on?S.subs.add(v):S.subs.delete(v); store.set('subs',[...S.subs]); haptic();
  document.querySelectorAll(`[data-tag="${CSS.escape(v)}"]`).forEach(n=>n.classList.toggle('sub', on));
  toast(on?`Вы подписались на тег «${esc(v)}»`:`Вы отписались от тега «${esc(v)}»`);
  if (S.screen==='main' && S.feedTab==='subs') render(false); };
A.subscribe = el => { const t = byId(el.dataset.id); t.my.subscribed = !t.my.subscribed; refreshCard(t.id); toast(t.my.subscribed?'Вы подписаны на Тропу — пришлём её дополнения':'Подписка отменена'); };
A.share = el => { const t = byId(el.dataset.id); t.my.shared = true; t.shares++; haptic('medium'); refreshCard(t.id); toast('Тропу получат ещё 12 человек рядом с вами'); };
A.x3d = el => { if (S.restricted) return toast('Буст недоступен в вашей стране. Раздавать Тропу бесплатно можно.'); openSheet('x3d', {id:el.dataset.id, amount:5}); };
A['x3d-amt'] = el => { S.sheet.params.amount = +el.dataset.v; S.sheet.params.other=false; S.sheet.params.otherVal=''; renderSheet(); };
A['x3d-other'] = () => { const p = S.sheet.params; p.other = true; p.amount = +p.otherVal || 0; renderSheet(); const i=document.getElementById('x3d-other-in'); if(i) i.focus(); };
A.resident = () => { S.residentOk = !S.residentOk; renderSheet(); };
A['x3d-pay'] = el => { const id = el.dataset.id, a = S.sheet.params.amount; S.residentDone = true;
  openSheet('paying', {amount:a});
  setTimeout(()=>{ const t = byId(id); const n = t.x3d + 1, coef = 0.3 + 2.7*Math.exp(-(n-1)/30);
    t.my.x3d = {n, amount:a, max:a*coef*300, min:a*0.3*300, viewed:0, fwd:0, at:Date.now()};
    if (!t.my.shared){ t.shares++; t.my.shared = true; } t.x3d++; t.my.subscribed = true;
    S.myX3d.unshift({title:t.frags[0].text.slice(0,34)+'…', st:'Активна', info:`${a} TON · №${n}`, rew:`до ${fmt(t.my.x3d.max)} DEMOS`});
    haptic('heavy'); openSheet('boosted', {id}); refreshCard(id); simulateBoost(id); }, 1400); };
function simulateBoost(id){ const t = byId(id); const iv = setInterval(()=>{ const x = t.my.x3d; if(!x){clearInterval(iv);return;}
  x.viewed = Math.min(36, x.viewed + 3 + Math.floor(Math.random()*4)); if (Math.random()>.55) x.fwd = Math.min(6, x.fwd+1);
  if (!S.sheet) refreshCard(id); if (x.viewed>=36 && x.fwd>=6) clearInterval(iv); }, 4000); }
A.mt = el => openSheet('mt', {id:el.dataset.id});
A.comments = el => openSheet('comments', {id:el.dataset.id});
A.reply = el => { S.replyTo = {id:+el.dataset.v, who:el.dataset.who}; renderSheet(); setTimeout(()=>{const i=document.getElementById('cmt'); i&&i.focus();},50); };
A['reply-cancel'] = () => { S.replyTo = null; renderSheet(); };
A['send-comment'] = el => { const i = document.getElementById('cmt'); const v = (i&&i.value||'').trim(); if(!v) return;
  const c = {id:Date.now(), who:'marsaon', ago:'сейчас', text:v, replies:[]};
  if (S.replyTo){ const p = S.comments.find(x=>x.id===S.replyTo.id); p && p.replies.push(c); S.replyTo=null; } else S.comments.unshift(c);
  const t = byId(el.dataset.id); t.comments++; renderSheet(); refreshCard(t.id); };
A['del-comment'] = el => { const id = +el.dataset.v; S.comments = S.comments.filter(c=>c.id!==id).map(c=>({...c, replies:c.replies.filter(r=>r.id!==id)})); renderSheet(); };
A.author = el => openSheet('author', {id:el.dataset.id});
A.sheet = el => openSheet(el.dataset.s, {id:el.dataset.id});
A['thank-v'] = el => { S.sheet.params.v = +el.dataset.v; renderSheet(); };
A['thank-send'] = el => { const t = byId(el.dataset.id), v = S.sheet.params.v; if (v > S.wallet.available) return toast('Недостаточно DEMOS');
  S.wallet.available -= v; t.my.thanked = true; openSheet('thanked', {id:t.id, v}); };
A.link = el => { const u = el.dataset.v; try{ tg ? tg.openLink(u) : window.open(u,'_blank'); }catch(e){} };
A.menu = el => openSheet('menu', {id:el.dataset.id});
A['report-do'] = () => { closeSheet(); toast('Жалоба отправлена модераторам'); };
A.addtag = el => { const t = byId(el.dataset.id);
  if (t.my.seen.size < t.frags.length) return toast('Сначала досмотрите Тропу до конца — пролистайте все фрагменты');
  openSheet('addtag', {id:t.id, q:''}); };
A['addtag-do'] = el => { const t = byId(el.dataset.id), v = el.dataset.v.trim(); if(!v) return;
  const known = POPULAR_TAGS.find(x=>x[0].toLowerCase()===v.toLowerCase());
  t.tags.push([known?known[0]:v, known?known[1]:'0', 1]); t.my.tagAdded = true; closeSheet(); refreshCard(t.id);
  toast(`Тег добавлен. Тропу получат ещё 8 человек — подписчики тега «${esc(known?known[0]:v)}»`); };
A.alltags = el => openSheet('alltags', {id:el.dataset.id});
A['open-trail'] = el => go('trail', {id:el.dataset.id});
A.create = () => {
  if (S.createdToday) return go('limit');
  S.draft = S.draft || {media:[], text:'', tags:[]};
  go('create1'); if (S.firstTrail) openSheet('firstTrail');
};
A['first-ok'] = () => { S.firstTrail = false; closeSheet(); };
A['demo-media'] = () => { S.draft.media = [{url:artSVG('user').slice(5,-2), kind:'photo'}]; render(false); };
A.ctag = el => { const v = el.dataset.v.trim(); const d = S.draft; const i = d.tags.indexOf(v);
  if (i>=0) d.tags.splice(i,1); else if (d.tags.length<3) d.tags.push(v); else toast('Максимум 3 тега');
  S.params.q=''; render(false); };
A['publish-ask'] = () => openSheet('publish', {ok:false});
A['publish-check'] = () => { S.sheet.params.ok = !S.sheet.params.ok; renderSheet(); };
A['publish-do'] = () => { const d = S.draft; const id = 'new'+Date.now();
  S.myTrails.unshift({id, author:'marsaon', own:true, fresh:true, ago:'только что', status:'active',
    frags:[{art:'user', text:d.text, url:d.media[0].url}], tags:d.tags.map(x=>{const k=POPULAR_TAGS.find(p=>p[0]===x); return [x,k?k[1]:'0',0];}),
    shares:0, x3d:0, mt:'0 TON', mtOf:0, strength:0, trend:'', comments:0, views:'108', my:{frag:0, seen:new Set([0])}});
  S.createdToday = true; S.createdAt = Date.now(); S.draft = null; S.newId = id; openSheet('published'); haptic('heavy'); };
A['see-mine'] = () => { S.sheet=null; S.stack=[]; S.screen='trail'; S.params={id:S.newId}; S.stack=[{screen:'main',params:{}}]; S.tab='profile'; render(true); };
A.addition = el => go('addition', {id:el.dataset.id});
A['addition-do'] = el => { const t = byId(el.dataset.id); const txt = (document.querySelector('[data-input="addtext"]')||{}).value||'';
  if (!txt.trim() && !S.params.added) return toast('Добавьте фото, видео или текст');
  t.frags.push({art:t.frags[t.frags.length-1].art, text:txt.trim()||'Новое дополнение'}); S.lastAddAt = Date.now();
  toast('Тропа дополнена. Подписчики получат уведомление'); back(); };
A.toast = el => toast(el.dataset.m);
A.reset = () => { try{localStorage.removeItem('demos_onboarded');}catch(e){} S.onboarded=false; S.stack=[]; go('splash',{},false); setTimeout(()=>{ if (S.screen==='splash') go('ob1',{},false); },1800); };
A.saved = () => { toast('Профиль сохранён'); back(); };
A.copy = () => { try{ navigator.clipboard.writeText('https://t.me/demos_bot?start=marsaon'); }catch(e){} toast('Ссылка скопирована'); };
A.ton = () => { S.wallet.ton = S.wallet.ton ? null : 'UQB…3fA2'; render(false); toast(S.wallet.ton?'Кошелёк подключён (тест)':'Кошелёк отключён'); };
A['claim-all'] = () => openSheet('claim');
A['claim-do'] = () => { S.wallet.available += 4579; S.wallet.vesting = 0; closeSheet(); render(false); toast('Зачислено 4 579 DEMOS'); };
A['withdraw-do'] = () => { if (!S.wallet.ton){ S.wallet.ton='UQB…3fA2'; render(false); return toast('Кошелёк подключён (тест)'); } toast('Вывод отправлен (тест)'); S.wallet.available = 0; back(); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || !$app.contains(el)) return;
  const fn = A[el.dataset.a]; if (fn){ e.preventDefault(); fn(el); }
});
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.input; if (!k) return;
  if (k==='text'){ S.draft.text = e.target.value; const c = document.getElementById('cnt'); if(c) c.textContent = `${S.draft.text.length}/1200`; const b = document.getElementById('next1'); if (b) b.disabled = !(S.draft.media.length && S.draft.text.trim()); }
  if (k==='ctag' || k==='tagsearch'){ S.params.q = e.target.value; clearTimeout(S._qt); S._qt = setTimeout(()=>{ const pos = e.target.selectionStart; render(false); const i = document.querySelector(`[data-input="${k}"]`); if(i){ i.focus(); try{i.setSelectionRange(pos,pos);}catch(_){} } }, 250); }
  if (k==='x3d-other'){ const p = S.sheet.params; const clean = e.target.value.replace(/\D/g,'').slice(0,3); if (clean !== e.target.value) e.target.value = clean;
    p.otherVal = clean; const n = +clean; const ok = n>=1 && n<=100; p.amount = ok ? n : 0;
    const t = byId(p.id), c = x3dCalc(t, ok?n:0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('x3d-big', ok ? n : '—'); set('x3d-max', `до ${fmt(c.max)} DEMOS`); set('x3d-min', `${fmt(c.min)} DEMOS`);
    const err = document.getElementById('x3d-err'); if (err) err.className = 'caption ' + (ok || !clean ? 'c-mut' : 'c-warn');
    const pay = document.getElementById('x3d-pay'); if (pay){ pay.disabled = !(ok && (S.residentOk||S.residentDone)); pay.textContent = ok ? `Оплатить ${n} TON` : 'Введите сумму'; } }
  if (k==='addtag-q'){ S.sheet.params.q = e.target.value; clearTimeout(S._qt); S._qt = setTimeout(()=>{ renderSheet(); const i = document.getElementById('addtag-q'); if(i){ i.focus(); const L=i.value.length; i.setSelectionRange(L,L);} }, 250); }
});
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.input;
  if (k==='media'){ const files = [...e.target.files].slice(0,10); if(!files.length) return;
    const f = files[0]; const url = URL.createObjectURL(f);
    if (f.type.startsWith('video')){ const v = document.createElement('video'); v.preload='metadata'; v.src=url;
      v.onloadedmetadata = () => { if (v.duration > 180){ toast('Видео длиннее 3 минут — обрежьте или выберите другое'); return; }
        const m = Math.floor(v.duration/60), s = Math.round(v.duration%60); S.draft.media = [{url, kind:'video', dur:`${m}:${String(s).padStart(2,'0')}`}]; render(false); };
    } else { S.draft.media = files.map(x=>({url:URL.createObjectURL(x), kind:'photo'})); render(false); } }
  if (k==='addmedia'){ S.params.added = true; render(false); }
});

// ---------- старт ----------
if (tg){ try{ tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#11151F'); tg.setBackgroundColor && tg.setBackgroundColor('#11151F'); tg.BackButton.onClick(back); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); }catch(e){} }
S.screen = S.onboarded ? 'main' : 'splash';
render(true);
if (!S.onboarded) setTimeout(()=>{ if (S.screen==='splash') go('ob1', {}, false); }, 1800);
window.DEMOS = {S, reset(){ try{localStorage.removeItem('demos_onboarded');}catch(e){} location.reload(); }};
})();
