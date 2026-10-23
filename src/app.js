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
  wallet: {ton:null},
  // счёт DEMOS: каждая покупка X3D — отдельная партия со своей датой (стейкинг считается по каждой партии)
  lots: [{at:Date.now()-10.2*86400000, demos:3000, title:'Пропал пёс Рони', ton:10, author:'boris', tip:5},{at:Date.now()-4.3*86400000, demos:1500, title:'Прорвало трубу на Профсоюзной', ton:5, author:'dom43_profsoyuznaya', tip:0},{at:Date.now()-0.6*86400000, demos:300, title:'Сломали площадку на Плющихе', ton:1, author:'semyon_p', tip:10}],
  myX3d: [{title:'Пропал пёс Рони', st:'На счёте', info:'10 TON · NFT получен', rew:'3 000 DEMOS'},{title:'Прорвало трубу на Профсоюзной', st:'На счёте', info:'5 TON · NFT получен', rew:'1 500 DEMOS'}],
  draft: null, geo: store.get('geo', null) || {lat:55.7387, lon:37.5806, label:'Москва, улица Плющиха, 12', acc:0, src:'demo'}, me: null, mapPoint: null,
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
// число подписчиков тега: одно на всё приложение, меняется при подписке/отписке
const TAGN = {};
const parseCnt = v => { const x = String(v).replace(/\s/g,''); return /тыс/.test(x) ? Math.round(parseFloat(x.replace(',','.'))*1000) : (parseInt(x,10)||0); };
const fmtCnt = n => n >= 1000 ? String(Math.round(n/100)/10).replace('.',',') + ' тыс.' : String(n);
const cnt = name => fmtCnt(TAGN[name] || 0);
[...TRAILS, ...MY_TRAILS].forEach(t => t.tags.forEach(g => { if (!(g[0] in TAGN)) TAGN[g[0]] = parseCnt(g[1]); }));
POPULAR_TAGS.forEach(g => { if (!(g[0] in TAGN)) TAGN[g[0]] = parseCnt(g[1]); });
const chipHTML = (tag, viewer) => `<button class="chip ${S.subs.has(tag[0])?'sub':''}" data-a="tag" data-tag="${esc(tag[0])}">${tag[2]||viewer?'<span class="vdot"></span>':''}<span>${esc(tag[0])}</span><span class="n">${esc(cnt(tag[0]))}</span></button>`;

// медиа фрагмента: своё фото/видео пользователя (в v0 — только в памяти телефона) или заглушка
const mediaBG = f => (f.url && f.kind!=='video') ? `url('${f.url}')` : artSVG(f.art);
const vidTag = (url, cls, style='') => `<video class="${cls}" src="${url}" style="${style}" autoplay muted loop playsinline webkit-playsinline preload="metadata"></video>`;
const slideHTML = f => (f.url && f.kind==='video') ? vidTag(f.url, 'slide') : `<div class="slide" style="background-image:${mediaBG(f)}"></div>`;
const thumbInner = f => (f.url && f.kind==='video') ? vidTag(f.url, '', 'width:100%;height:100%;object-fit:cover;border-radius:10px') : '';

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
      ${slideHTML(f)}
      <div class="shade-top"></div><div class="shade-bot"></div>
      ${bars}
      <button class="tap-prev" data-a="frag" data-id="${t.id}" data-d="-1" aria-label="Предыдущий фрагмент"></button>
      <button class="tap-next" data-a="frag" data-id="${t.id}" data-d="1" aria-label="Следующий фрагмент"></button>
      <div class="tags-strip">${tags}</div>
      ${canAdd?'<div class="tags-fade"></div>':''}
      ${canAdd?`<button class="add-tag" data-a="addtag" data-id="${t.id}" aria-label="Добавить тег">+</button>`:''}
      ${author}
      <div class="overlay">${strengthHTML(t.strength,t.trend)}<div class="txt ${t.my.expanded?'full':''}" data-a="expand" data-id="${t.id}">${esc(f.text)}</div></div>
      <div class="rail">${f.url && f.kind==='video' ? `<button data-a="sound">${(!S.sound||S.soundBlocked)?ICON_SND_OFF:ICON_SND_ON}<span>${(!S.sound||S.soundBlocked)?'Звук выкл.':'Звук'}</span></button>` : ''}<button data-a="comments" data-id="${t.id}">${I.comment}<span>${t.comments}</span></button><div>${I.eye}<span>${t.views}</span></div></div>
    </div>
    ${actionsHTML(t)}
  </section>`;
}
// уровень Money Trust: цвет треугольника по «N из 100 выбирают X3D»
const MT_LEVELS = [[25,'#A78BFA'],[15,'#F0524F'],[8,'#3D8BFF'],[3,'#F5A524'],[0,'#9AA3B8']];
const mtColor = n => MT_LEVELS.find(l => n >= l[0])[1];
const mtTri = (n, size=12) => `<svg class="mt-tri" width="${size}" height="${Math.round(size*0.92)}" viewBox="0 0 12 11"><path d="M6 .8L11.4 10.2H.6Z" fill="${mtColor(n)}" stroke="${mtColor(n)}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
function mtRow(t){
  return `<button class="mt" data-a="mt" data-id="${t.id}" style="width:100%;text-align:left"><span class="lbl">Money Trust</span><span class="val">${t.mt}</span><span class="share">${mtTri(t.mtOf)}<b>${t.mtOf} из 100</b><span class="of">выбирают X3D</span></span><span class="info-i">i</span></button>`;
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
    const x = m.x3d;
    return `<div class="actions"><div class="part">
      <div class="top"><span class="strong">Вы поддержали Тропу</span>${strengthHTML(t.strength,t.trend)}</div>
      <div class="top"><span class="heading">+${fmt(x.demos)} DEMOS</span><span class="caption c-sec">${x.amount} TON · NFT получен</span></div>
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
  setTimeout(syncVideos, 0);
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
SCREENS.ob2 = () => obSlide(2,'12 → 36','X3D — буст для важного','Если Тропа важна, усильте её: X3D доставит её 36 людям вместо 12. Вся сумма превращается в DEMOS и остаётся на вашем счёте.','terms');
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
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom));display:flex;flex-direction:column;gap:8px"><button class="btn primary" data-a="geo-allow">Разрешить геолокацию</button><button class="btn ghost" data-a="map-manual">Отметить точку вручную</button></div></div>`;
SCREENS.map = () => { const mode = S.params.mode || (S.onboarded?'edit':'onboard'); const create = mode==='create'; const P = S.mapPoint || (S.mapPoint = {...S.geo});
  return `<div class="screen">${topbar(create?'Место начала раздачи':'Где вы находитесь?')}
  <div class="map" id="mapbox"><div class="road" style="left:0;right:0;top:30%;height:14px;transform:rotate(-8deg)"></div><div class="road" style="top:0;bottom:0;left:62%;width:12px;transform:rotate(12deg)"></div><div class="road" style="left:0;right:0;top:66%;height:8px"></div><div class="pin"><i></i></div><div class="map-attr">© OpenStreetMap</div></div>
  <div class="sheet" style="position:relative;animation:none;border-radius:20px 20px 0 0;margin-top:-20px;z-index:950"><div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
    <div><div class="heading" id="map-label">${esc(P.label||'Определяем адрес…')}</div><div class="caption c-mut" id="map-sub">${mapSub(P, create)}</div></div>
    <div class="body c-sec">${create?'Тропа начнёт расходиться от этой точки — сначала к самым ближним. Если событие было в другом месте рядом, передвиньте карту: не дальше 10 км от вас.':'DEMOS работает от вашей точки: Тропы приходят от неё — сначала самым ближним. Передвиньте карту, чтобы метка стояла точно там, где вы, и подтвердите.'}</div>
    ${create?'':'<div class="caption c-mut">Другие пользователи вашу точку не видят — только расстояние до Тропы.</div>'}
    <div class="caption c-warn hidden" id="map-warn">Слишком далеко: точку можно поставить не дальше 10 км от вас.</div></div>
    <div class="foot"><button class="btn primary" id="map-ok" data-a="map-ok">${create?'Подтвердить точку':'Я нахожусь здесь'}</button><button class="btn ghost" data-a="map-locate">${create?'Вернуть мою геопозицию':'Определить по геолокации'}</button></div></div></div>`; };
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
      ${list.length ? list.map(t=>`<button class="list-item" style="width:100%;text-align:left" data-a="open-trail" data-id="${t.id}"><div class="thumb" style="background-image:${mediaBG(t.frags[0])}">${thumbInner(t.frags[0])}</div><div style="flex:1;min-width:0"><div class="strong" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.frags[0].text)}</div><div class="caption c-mut">@${t.author} · ${t.ago}</div>${t.my.x3d?'<span class="badge acc" style="margin-top:4px">Вы в бусте</span>':''}</div></button>`).join('') : '<div class="empty">Пока нет подписок. Нажмите «Подписаться» на Тропе — сюда придут её дополнения.</div>'}</div>`;
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
  return `<div class="pad">${S.myTrails.map(t=>`<div class="list-item"><button class="thumb" style="background-image:${mediaBG(t.frags[0])}" data-a="open-trail" data-id="${t.id}">${thumbInner(t.frags[0])}</button>
    <div style="flex:1;min-width:0" data-a="open-trail" data-id="${t.id}"><div class="strong" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.frags[0].text)}</div>
    <div style="margin-top:4px">${t.status==='finished'?'<span class="badge mut">Тропа завершена</span>':strengthHTML(t.strength,t.trend)}</div>
    <div class="caption c-sec">${fmt(t.shares)} раздали · ${t.x3d} X3D · ${t.mt} Money Trust</div></div>
    ${t.status==='active'?`<button class="badge acc" style="height:30px" data-a="addition" data-id="${t.id}">Дополнить</button>`:''}</div>`).join('')}
    <div class="caption c-mut" style="padding:14px 0 24px">Свои Тропы — только здесь. В «Подписках» — чужие Тропы.</div></div>`;
}
// комиссия за вывод по дням хранения (стейкинг): <3 — 15%, 3+ — 10%, 7+ — 8%, 10+ — 6%
const daysHeld = l => Math.floor((Date.now()-l.at)/86400000);
const feeFor = d => d>=10?6 : d>=7?8 : d>=3?10 : 15;
const nextTier = d => d<3?{at:3,fee:10} : d<7?{at:7,fee:8} : d<10?{at:10,fee:6} : null;
const balance = () => S.lots.reduce((a,l)=>a+l.demos,0);
// награда автору: % от покупки, который зритель оставляет автору; передаётся при выводе или когда Тропа завершится
const lotTip = l => Math.round(l.demos*(l.tip||0)/100);
const lotOut = (l, f = feeFor(daysHeld(l))) => Math.round((l.demos - lotTip(l))*(1-f/100));
const netOut = () => S.lots.reduce((a,l)=>a+lotOut(l),0);
const tipsTotal = () => S.lots.reduce((a,l)=>a+lotTip(l),0);
function tipChooser(base, sel, custom){
  return `<div class="amounts">${[5,10,20].map(v=>`<button class="amt tipb ${sel===v?'on':''} ${v===5&&sel!==5?'rec':''}" data-a="tip-pick" data-v="${v}"><span>${v}%</span><small>${fmt(base*v/100)}</small></button>`).join('')}<button class="amt tipb ${sel==='custom'?'on':''}" data-a="tip-pick" data-v="custom"><span>Своя</span><small>${sel==='custom'&&+custom?fmt(base*custom/100):'%'}</small></button></div>
   ${sel==='custom'?`<div class="field" style="display:flex;gap:8px;align-items:center"><input id="tip-custom" type="text" inputmode="numeric" maxlength="3" placeholder="Свой процент, от 1 до 100" value="${esc(custom||'')}" data-input="tip-custom"><span class="c-sec">%</span></div>`:''}
   <div class="caption c-acc">5% — рекомендуемая награда</div>`;
}
const tipValue = p => p.tip==='custom' ? Math.min(100, Math.max(0, +p.tipCustom||0)) : (p.tip||0);
const dayWord = n => (n%10===1&&n%100!==11)?'день':(n%10>=2&&n%10<=4&&(n%100<12||n%100>14))?'дня':'дней';
function lotHTML(l){ const d = daysHeld(l), f = feeFor(d), nt = nextTier(d), out = lotOut(l, f);
  const startAt = d<3?0:d<7?3:d<10?7:10, pct = nt ? Math.round(100*(d-startAt)/(nt.at-startAt)) : 100;
  return `<div class="lot"><div class="top"><span class="strong">+${fmt(l.demos)} DEMOS</span><span class="badge ${f===6?'suc':'mut'}">комиссия ${f}%</span></div>
    <div class="caption c-mut">${esc(l.title)} · ${l.ton} TON</div>
    <div class="top caption" style="margin-top:6px"><span class="c-sec">Лежит ${d} ${dayWord(d)}</span><span>на кошелёк сейчас <b>${fmt(out)}</b></span></div>
    <div class="prog" style="height:4px"><i style="width:${pct}%"></i></div>
    <div class="caption c-mut">${nt?`Через ${nt.at-d} ${dayWord(nt.at-d)} — комиссия ${nt.fee}%, на кошелёк ${fmt(lotOut(l, nt.fee))}`:'Минимальная комиссия — 6%'}</div>
    <div class="top caption" style="margin-top:4px;border-top:1px solid var(--b-default);padding-top:8px"><span class="c-sec">${l.tip?`Автору @${esc(l.author||'')}: ${l.tip}% · ${fmt(lotTip(l))} DEMOS`:'Награда автору не выбрана'}</span><button class="c-acc" style="font-weight:600" data-a="tip-edit" data-i="${S.lots.indexOf(l)}">Изменить</button></div></div>`; }
function walletHTML(){
  const w = S.wallet, bal = balance();
  return `<div class="pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
    <div class="box"><div class="caption c-sec">На счёте</div><div style="display:flex;align-items:baseline;gap:6px"><span class="title">${fmt(bal)}</span><span class="c-sec">DEMOS</span></div>
      <div class="caption c-sec" style="margin-top:2px">Вывести сейчас: ${fmt(netOut())} DEMOS после комиссии${tipsTotal()?` и награды авторам (${fmt(tipsTotal())})`:''}</div>
      <button class="btn primary" style="margin-top:10px" data-a="go" data-to="withdraw" ${bal?'':'disabled'}>Вывести на кошелёк</button></div>
    ${S.lots.length?`<div class="strong" style="margin-top:6px">Покупки на счёте</div><div class="caption c-mut" style="margin-top:-6px">Комиссия при выводе зависит от того, сколько дней лежит каждая покупка: меньше 3 дней — 15%, от 3 — 10%, от 7 — 8%, от 10 — 6%.</div>${S.lots.map(lotHTML).join('')}`:''}
    <div class="box" style="display:flex;justify-content:space-between;align-items:center"><span class="caption">${w.ton?'TON-кошелёк '+w.ton:'TON-кошелёк не подключён'}</span><button class="caption c-acc" data-a="ton">${w.ton?'Отключить':'Подключить'}</button></div>
    <div class="strong" style="margin-top:6px">Мои X3D</div>
    ${S.myX3d.map(x=>`<div class="kv"><div><div class="strong">${esc(x.title)}</div><div class="caption c-mut">${x.info}</div></div><div style="text-align:right"><span class="badge ${x.st==='На счёте'?'acc':'mut'}">${x.st}</span><div class="caption c-sec">${x.rew}</div></div></div>`).join('')}
    <div class="strong" style="margin-top:6px">Вы как автор</div>
    <div class="kv"><div><div>Получено от зрителей</div><div class="caption c-mut">за 30 дней · обновляется сразу</div></div><span class="strong">3 260 DEMOS</span></div>
    <div class="kv"><div><div>Вас поблагодарили</div><div class="caption c-mut">разово, за ваши Тропы</div></div><span class="strong">37 человек</span></div>
    <div class="box" style="margin-top:6px"><div class="strong">Пригласите друзей</div><div class="caption c-sec" style="margin:4px 0 8px">1% от каждого их буста X3D — вам в TON, сразу. Действует 6 месяцев с момента, как друг пришёл по ссылке.</div>
      <button class="caption c-acc" style="text-align:left" data-a="go" data-to="referrals">Приглашено ${REFERRAL.friends.length} · получено ${refTotal()} TON  →</button>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">t.me/demos_bot?start=marsaon</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`;
}

SCREENS.trail = () => { const t = byId(S.params.id); return `<div class="screen">${topbar(t.own?'Ваша Тропа':'Тропа')}<div class="feed">${cardHTML(t)}</div></div>`; };

// ---------- приглашённые ----------
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const tonFmt = n => String(Math.round(n*10)/10).replace('.',',');
const refEarned = nick => REFERRAL.ledger.filter(e=>e.friend===nick).reduce((a,e)=>a+e.amount,0);
function refTotal(){ return tonFmt(REFERRAL.ledger.reduce((a,e)=>a+e.amount,0)); }
function refLeft(f){ const d = new Date(f.joined+'T00:00:00'); const end = new Date(d); end.setMonth(end.getMonth()+REFERRAL.months);
  const ms = end - Date.now(); return ms<=0 ? 0 : Math.ceil(ms/(30.44*86400000)); }
SCREENS.referrals = () => { const fr = REFERRAL.friends;
  return `<div class="screen">${topbar('Приглашённые')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="box center" style="padding:20px"><div class="caption c-sec">Получено от приглашённых</div><div style="display:flex;justify-content:center;align-items:baseline;gap:6px;margin-top:4px"><span class="title" style="font-size:36px">${refTotal()}</span><span class="c-sec">TON · ${fr.length} ${fr.length===1?'друг':fr.length<5?'друга':'друзей'}</span></div></div>
  <div class="caption c-sec">1% от каждого буста X3D приглашённого — вам в TON сразу. По каждому другу действует 6 месяцев с момента, как он пришёл по вашей ссылке.</div>
  <div class="strong">Друзья</div>
  <div>${fr.map(f=>{ const d=new Date(f.joined+'T00:00:00'); const left=refLeft(f);
    return `<div class="kv"><div><div class="strong">@${esc(f.nick)}</div><div class="caption ${left?'c-mut':'c-warn'}">${f.she?'пришла':'пришёл'} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} · ${left?`осталось ${left} мес`:'срок истёк'}</div></div><span class="strong c-suc">+${tonFmt(refEarned(f.nick))} TON</span></div>`; }).join('')}</div>
  <div class="caption c-mut">После 6 месяцев друг остаётся в DEMOS, но 1% от его бустов больше не начисляется.</div>
  <div style="display:flex;gap:8px;align-items:center"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">${REFERRAL.link}</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`; };

SCREENS.withdraw = () => { const bal = balance(), out = netOut();
  return `<div class="screen">${topbar('Вывод DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px">
  <div class="box center" style="padding:20px"><div class="caption c-sec">На кошелёк</div><div class="title" style="font-size:36px">${fmt(out)}</div><div class="caption c-sec">DEMOS из ${fmt(bal)} на счёте</div></div>
  <div class="strong">По каждой покупке</div>
  ${S.lots.map(l=>{ const d=daysHeld(l), f=feeFor(d); return `<div class="kv"><div><div>+${fmt(l.demos)} DEMOS</div><div class="caption c-mut">лежит ${d} ${dayWord(d)} · комиссия ${f}%</div><div class="caption c-mut">${l.tip?`автору ${l.tip}% · ${fmt(lotTip(l))}`:'без награды автору'} · <button class="c-acc" data-a="tip-edit" data-i="${S.lots.indexOf(l)}">изменить</button></div></div><span class="v">${fmt(lotOut(l,f))}</span></div>`; }).join('')}
  <div class="kv"><span class="k">Награда авторам</span><span class="v">${fmt(tipsTotal())} DEMOS</span></div>
  <div class="kv"><span class="k">Комиссия всего</span><span class="v">${fmt(bal-out-tipsTotal())} DEMOS</span></div>
  <div class="kv"><span class="k">Кошелёк</span><span class="v">${S.wallet.ton||'не подключён'}</span></div>
  <div class="caption c-mut">Награда автору передаётся при выводе — её можно изменить прямо здесь. Чтобы комиссия была меньше, подождите: от 3 дней — 10%, от 7 — 8%, от 10 — 6%. Сеть TON возьмёт около 0,05 TON. В тестовой версии вывод условный.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="withdraw-do" ${bal?'':'disabled'}>${S.wallet.ton?`Вывести ${fmt(out)} DEMOS`:'Подключить кошелёк'}</button></div></div>`; };

SCREENS.about = () => `<div class="screen">${topbar('О DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:18px;padding-bottom:24px">
  <div class="title" style="font-size:26px;line-height:1.3;margin:10px 0">Правда —<br>это мнение, выдержавшее<br>равную конкуренцию</div>
  ${[['Равный старт','Любую новую Тропу сразу получают 108 человек рядом и по тегам, дальше — по 12 за каждое «Раздать». Неважно, кто автор и сколько у него знакомых.'],['Никаких подписчиков','Нет поиска людей и Троп, нет подписок на людей. Тропа расходится, только если её раздают.'],['Цену назначают люди','«Раздать» — голос бесплатно. X3D — голос, за который человек платит, расширяя охват до 36.'],['Одна новая Тропа в день','Создать новую можно раз в сутки — лента не заваливается. А дополнять свою Тропу можно сколько угодно: история развивается.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="body c-sec">${b[1]}</div></div>`).join('')}
  <div>${['Как работает X3D','Условия использования','Политика конфиденциальности'].map((x,i)=>`<button class="kv" style="width:100%" ${i===0?'data-a="go" data-to="reward"':''}><span>${x}</span><span class="c-mut">›</span></button>`).join('')}</div>
  <button class="btn secondary" data-a="reset">Пройти онбординг заново</button>
  <div class="caption c-mut center">DEMOS · версия 0.20 · тестовые данные</div></div></div>`;

SCREENS.reward = () => `<div class="screen">${topbar('Как работает X3D')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="body c-sec">X3D — это буст: Тропу увидят ещё 36 человек. Вся сумма превращается в DEMOS на вашем счёте. Это не обещание дохода.</div>
  ${[['1. Оплата','1, 10 или 100 TON. Комиссии при покупке нет.'],['2. Обмен','Вся сумма сразу превращается в DEMOS по рынку. Курс фиксируется в момент обмена, цифры в окне оплаты действуют 60 секунд.'],['3. Счёт','DEMOS лежат на вашем счёте в приложении. Каждая покупка хранится отдельно.'],['4. Вывод','Вывести DEMOS на свой кошелёк можно в любой момент. Комиссия зависит от того, сколько дней лежит каждая покупка: меньше 3 дней — 15%, от 3 — 10%, от 7 — 8%, от 10 — 6%.'],['5. NFT','Бесплатно — подтверждение, что вы поддержали эту Тропу. Ничего не открывает в приложении. Его можно хранить или продать на маркетплейсе.'],['6. Охват','Одинаковый при любой сумме: +36 человек. Сумма влияет только на количество DEMOS и на Money Trust Тропы.'],['7. Приглашения','Пригласивший получает 1% от каждого X3D друга в TON — 6 месяцев. Это платит платформа, у вас ничего не удерживается.'],['8. Пилот','На пилоте DEMOS — внутренние очки, вывода на кошелёк ещё нет.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="caption c-sec">${b[1]}</div></div>`).join('')}
  <div class="box"><div class="strong">Пример</div><div class="caption c-sec">Вы оплатили 10 TON. По курсу 1 TON = 300 DEMOS на ваш счёт придёт 3 000 DEMOS. Вывод через день — 2 550 DEMOS на кошелёк, через 10 дней — 2 820. Курс в примере условный.</div></div>
  <div class="caption c-mut">Цена DEMOS не гарантируется. X3D и вывод недоступны в некоторых странах.</div></div></div>`;

SCREENS.edit = () => `<div class="screen">${topbar('Изменить профиль')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:20px">
  <div><div class="caption c-sec">Никнейм</div><div class="field" style="display:flex;justify-content:space-between"><span>@marsaon</span><span>🔒</span></div><div class="caption c-mut">Уникальный. Его видят все вместо имени и аватарки.</div></div>
  <div><div class="caption c-sec">Город</div><button class="field" style="width:100%;text-align:left" data-a="map-edit">${esc(S.geo.label||'Москва')}</button><div class="caption c-mut">По вашей точке на карте. Нажмите, чтобы изменить точку.</div></div>
  <div><div class="caption c-sec">О себе</div><div class="field"><textarea maxlength="160" style="min-height:70px">Пишу о том, что происходит в Хамовниках и вокруг. Без фейков.</textarea></div></div>
  <div><div class="caption c-sec">Соцсети</div><div class="caption c-mut" style="margin-bottom:6px">Видны всем, кто нажмёт на ваш ник. Добавляются ссылкой.</div>
  ${[['Telegram','@marsaon'],['Instagram','@marsaon.msk'],['YouTube',''],['VK',''],['TikTok','']].map(s=>`<div class="kv"><span>${s[0]}</span>${s[1]?`<span class="c-acc">${s[1]}</span>`:'<button class="c-acc caption" data-a="toast" data-m="Вставьте ссылку на профиль — ник подтянется сам">Добавить</button>'}</div>`).join('')}</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="saved">Сохранить</button></div></div>`;

// создание Тропы
SCREENS.create1 = () => { const d = S.draft; const media = d.media.length;
  return `<div class="screen">${topbar('Новая Тропа','1/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:16px">
  <label class="box" style="height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background-size:cover;background-position:center;${media&&d.media[0].kind!=='video'?`background-image:url('${d.media[0].url}')`:''};position:relative;cursor:pointer;overflow:hidden">
    ${media&&d.media[0].kind==='video'?vidTag(d.media[0].url,'','position:absolute;inset:0;width:100%;height:100%;object-fit:cover'):''}
    <input type="file" accept="image/*,video/*" multiple data-input="media" style="display:none">
    ${media?`<span class="badge mut" style="position:absolute;top:10px;right:10px">${d.media[0].kind==='video'?(d.media[0].dur+' из 3:00'):media+' фото'}</span><span class="badge acc" style="position:absolute;bottom:10px;right:10px">Заменить</span>`:'<div style="font-size:30px">+</div><div class="strong">Видео или фото</div>'}
  </label>
  ${media?'':'<button class="caption c-acc" data-a="demo-media">Взять пример для теста</button>'}
  <div class="caption c-mut">Видео до 3 минут или до 10 фото</div>
  <div><div style="display:flex;justify-content:space-between"><span class="caption c-sec">Текст</span><span class="caption c-mut" id="cnt">${d.text.length}/1200</span></div>
  <div class="field"><textarea maxlength="1200" data-input="text" placeholder="Что происходит? Без заголовка — просто расскажите.">${esc(d.text)}</textarea></div></div>
  <button class="field" style="width:100%;text-align:left;display:flex;gap:10px;align-items:center" data-a="draft-geo"><span>📍</span><span style="flex:1;min-width:0"><span class="caption c-mut">Место начала раздачи</span><br><span class="strong" id="draft-geo-label">${esc(d.geo.label||'Определяем адрес…')}</span><br><span class="caption c-mut" id="draft-geo-sub">${d.geo.src==='gps'?'по GPS':d.geo.src==='manual'?'указано вручную':'точка из профиля'}</span></span><span class="caption c-acc">Изменить</span></button></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="go" data-to="create2" ${media&&d.text.trim()?'':'disabled'} id="next1">Далее</button></div></div>`; };
SCREENS.create2 = () => { const d = S.draft; const q=(S.params.q||'').trim();
  const list = POPULAR_TAGS.filter(t=>!q || t[0].toLowerCase().includes(q.toLowerCase()));
  return `<div class="screen">${topbar('Новая Тропа','2/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:16px">
  <div class="title">Выберите теги</div><div class="body c-sec">От 1 до 3 тегов. Тропу сразу получат подписчики этих тегов и люди рядом с вами. Другие люди смогут добавить к ней другие теги.</div>
  <div class="field"><input placeholder="Найти или создать тег" value="${esc(q)}" data-input="ctag"></div>
  ${d.tags.length?`<div class="tag-grid">${d.tags.map(t=>`<button class="chip sub" data-a="ctag" data-v="${esc(t)}">${esc(t)} ✕</button>`).join('')}</div>`:''}
  <div class="tag-grid">${list.filter(t=>!d.tags.includes(t[0])).map(t=>`<button class="chip" data-a="ctag" data-v="${esc(t[0])}">${t[0]} <span class="n">${cnt(t[0])}</span></button>`).join('')}</div>
  ${q && !POPULAR_TAGS.some(t=>t[0].toLowerCase()===q.toLowerCase()) ? `<button class="btn secondary" data-a="ctag" data-v="${esc(q)}">Создать тег «${esc(q)}»</button>`:''}
  <div class="caption c-mut">Выбрано ${d.tags.length} из 3</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="go" data-to="create3" ${d.tags.length?'':'disabled'}>Далее</button></div></div>`; };
SCREENS.create3 = () => { const d=S.draft;
  return `<div class="screen">${topbar('Превью','3/3')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:16px">
  <div style="height:340px;border-radius:16px;position:relative;overflow:hidden;background:#000 center/cover;${d.media[0].kind!=='video'?`background-image:url('${d.media[0].url}')`:''}">${d.media[0].kind==='video'?vidTag(d.media[0].url,'','position:absolute;inset:0;width:100%;height:100%;object-fit:cover'):''}
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
  <div class="list-item" style="border:0"><div class="thumb" style="background-image:${mediaBG(t.frags[0])}">${thumbInner(t.frags[0])}</div><div><div class="strong">${esc(t.frags[0].text.slice(0,60))}…</div><div class="caption c-mut">Ваша Тропа · ${t.frags.length} фрагмента</div></div></div>
  <label class="box" style="display:flex;align-items:center;gap:12px;cursor:pointer"><input type="file" accept="image/*,video/*" style="display:none" data-input="addmedia"><span class="icon-circle" style="width:44px;height:44px;margin:0;background:var(--bg-accent-soft);color:var(--t-accent)">+</span><span><span class="strong">Видео до 3 минут или фото</span><br><span class="caption c-mut">${S.params.addMedia?(S.params.addMedia.kind==='video'?'Видео '+S.params.addMedia.dur+' · заменить':'Фото выбрано · заменить'):'Снять сейчас или выбрать из галереи'}</span></span></label>
  ${S.params.addMedia?`<div style="height:220px;border-radius:14px;overflow:hidden;position:relative;background:#000 center/cover;${S.params.addMedia.kind!=='video'?`background-image:url('${S.params.addMedia.url}')`:''}">${S.params.addMedia.kind==='video'?vidTag(S.params.addMedia.url,'','position:absolute;inset:0;width:100%;height:100%;object-fit:cover'):''}</div>`:''}
  <div class="field"><textarea maxlength="1200" data-input="addtext" placeholder="Что нового?">${esc(S.params.addText||'')}</textarea></div>
  <div class="caption c-mut">Дополнение станет новым фрагментом Тропы — у зрителей появится новая полоска сверху. Подписчики Тропы получат уведомление. Дополнять можно сколько угодно раз, не чаще раза в минуту.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn primary" data-a="addition-do" data-id="${t.id}" ${wait?'disabled':''}>${wait?`Следующее дополнение через 0:${String(wait).padStart(2,'0')}`:'Дополнить Тропу'}</button></div></div>`; };

// ---------- листы ----------
function openSheet(name, params={}){ document.querySelectorAll('.toast').forEach(n=>n.remove()); S.sheet = {name, params}; renderSheet(); haptic(); }
function closeSheet(){ S.sheet = null; renderSheet(); }
const SHEETS = {};
function x3dCalc(t, a){ const n = t.x3d + 1, coef = 0.3 + 2.7*Math.exp(-(n-1)/30); return {n, max:a*coef*300, min:a*0.3*300}; }
const RATE = 300; // тестовая цена: 1 TON = 300 DEMOS
const NFT_TIERS = [{ton:1, g:['#1d4ed8','#3DB4FF']}, {ton:10, g:['#6d28d9','#3D8BFF']}, {ton:100, g:['#b45309','#f5a524']}];
const nftCard = (tier, on) => `<button class="nft ${on?'on':''}" data-a="x3d-amt" data-v="${tier.ton}">
  ${NFT_IMG[tier.ton] ? `<span class="nft-img"><img src="${NFT_IMG[tier.ton]}" alt="NFT X3D ${tier.ton} TON"></span>` : `<span class="nft-art" style="background:linear-gradient(145deg,${tier.g[0]},${tier.g[1]})"><span class="nft-badge">NFT</span>
  <svg viewBox="0 0 40 36" class="nft-tri"><path d="M20 3L37 33H3z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>
  <span class="nft-x">X3D</span></span>`}
  <span class="nft-ton">${tier.ton} TON</span><span class="nft-dm">≈ ${fmt(tier.ton*RATE)} DEMOS</span></button>`;
SHEETS.x3d = p => { const t = byId(p.id); const a = p.amount || 10;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div style="display:flex;justify-content:space-between;align-items:center"><div class="heading">Буст Тропы</div>${strengthHTML(t.strength,t.trend)}</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам</div>
   <div class="nft-row">${NFT_TIERS.map(tr=>nftCard(tr, tr.ton===a)).join('')}</div>
   <div><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">На ваш счёт</span><span class="v">≈ ${fmt(a*RATE)} DEMOS</span></div><div class="kv"><span class="k">NFT «Поддержал Тропу»</span><span class="v">бесплатно</span></div><div class="kv"><span class="k">Комиссия при покупке</span><span class="v">нет</span></div></div>
   <div class="tipbox"><div class="top"><span class="strong">Награда автору</span><span class="caption c-mut">необязательно</span></div>
   <div class="caption c-sec">Сколько DEMOS из этой покупки оставить @${esc(t.author)}. Передаются, когда Тропа завершится или когда вы выводите DEMOS — тогда же можно изменить.</div>
   ${tipChooser(a*RATE, p.tip, p.tipCustom)}</div>
   <div class="caption c-mut">Вся сумма сразу превращается в DEMOS по рынку и лежит на вашем счёте в приложении. Комиссия — только при выводе на кошелёк: меньше 3 дней — 15%, от 3 дней — 10%, от 7 дней — 8%, от 10 дней — 6%. NFT подтверждает, что вы поддержали эту Тропу: его можно хранить или продать. Цена DEMOS не гарантируется.</div>
   <button class="caption c-acc" style="text-align:left" data-a="go" data-to="reward">Как работает X3D →</button>
   ${S.residentDone?'':`<div class="check ${S.residentOk?'on':''}" data-a="resident"><span class="bx"></span><span>Я не резидент стран из списка ограничений</span></div>`}</div>
   <div class="foot"><button class="btn primary" id="x3d-pay" data-a="x3d-pay" data-id="${t.id}" ${(S.residentOk||S.residentDone)?'':'disabled'}>Оплатить ${a} TON</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.tipEdit = p => { const l = S.lots[p.i]; if (!l) return '';
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px"><div class="heading">Награда автору</div>
   <div class="caption c-sec">${esc(l.title)} · +${fmt(l.demos)} DEMOS. Сколько оставить @${esc(l.author||'')}? Передаётся при выводе или когда Тропа завершится.</div>
   ${tipChooser(l.demos, p.tip, p.tipCustom)}
   <button class="amt ${p.tip===0?'on':''}" style="height:40px" data-a="tip-pick" data-v="0">Без награды</button></div>
   <div class="foot"><button class="btn primary" data-a="tip-save">Сохранить</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.paying = p => `<div class="grab"></div><div class="sc center" style="padding-top:10px"><div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">⌛</div><div class="heading">Подтвердите в кошельке</div><div class="caption c-sec" style="margin:6px 0 16px">Откройте кошелёк и подтвердите оплату ${p.amount} TON. В тестовой версии оплата пройдёт сама.</div></div>`;
SHEETS.boosted = p => { const t = byId(p.id), x = t.my.x3d;
  return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">✓</div><div class="heading">Вы поддержали Тропу</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам. Вы подписаны на Тропу — пришлём её дополнения.</div>
   <div style="text-align:left"><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">На ваш счёт</span><span class="v">+${fmt(x.demos)} DEMOS</span></div><div class="kv"><span class="k">NFT «Поддержал Тропу»</span><span class="v">получен</span></div><div class="kv"><span class="k">Награда автору</span><span class="v">${x.tip?`${x.tip}% · ${fmt(Math.round(x.demos*x.tip/100))} DEMOS`:'не выбрана'}</span></div></div>
   <div class="caption c-mut">Награду автору можно изменить, когда Тропа завершится или когда будете выводить DEMOS. В тестовой версии оплата, DEMOS и NFT условные.</div></div>
   <div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
SHEETS.mt = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Money Trust</div><div class="body c-sec">Показывает, насколько люди готовы платить за охват этой Тропы.</div>
   <div class="box"><div class="title">${t.mt}</div><div class="caption c-sec">Сколько всего заплатили за X3D этой Тропы.</div></div>
   <div class="box"><div class="strong" style="display:flex;align-items:center;gap:6px">${mtTri(t.mtOf,14)}${t.mtOf} из 100 выбирают X3D</div>
   <div style="display:flex;flex-direction:column;gap:6px;margin:12px 0"><span class="micro c-mut">ЦВЕТ ТРЕУГОЛЬНИКА</span>${[[0,'меньше 3 из 100'],[3,'от 3 до 7'],[8,'от 8 до 14'],[15,'от 15 до 24'],[25,'25 и больше']].map(l=>`<span class="caption c-sec" style="display:flex;align-items:center;gap:8px">${mtTri(l[0])}${l[1]}</span>`).join('')}</div>
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
   <div class="caption c-sec">С вашего счёта: ${fmt(balance())} DEMOS. Сколько отправите — столько автор и получит.</div>
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
   <div class="caption c-mut">Похожие теги</div><div class="tag-grid">${sugg.map(x=>`<button class="chip" data-a="addtag-do" data-id="${t.id}" data-v="${esc(x[0])}">${x[0]} <span class="n">${cnt(x[0])}</span></button>`).join('')}</div>
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
// ---------- рендер ----------
function render(forward){
  const feed = document.getElementById('feed'); if (feed && S._lastScreen==='main') S.feedTop = feed.scrollTop;
  const html = SCREENS[S.screen] ? SCREENS[S.screen]() : '';
  $app.innerHTML = html;
  const scr = $app.querySelector('.screen'); if (scr && forward) scr.classList.add('anim-in');
  const f2 = document.getElementById('feed'); if (f2 && S.screen==='main' && S.feedTop) f2.scrollTop = S.feedTop;
  S._lastScreen = S.screen;
  renderSheet(); syncBackButton();
  if (S.screen==='map') setTimeout(initMap, 0); else killMap();
  setTimeout(syncVideos, 0);
}
function renderSheet(){
  const prev = $app.querySelector('.sheet.float'); const same = prev && S.sheet && prev.dataset.name === S.sheet.name;
  const prevScroll = same && prev.querySelector('.sc') ? prev.querySelector('.sc').scrollTop : 0;
  $app.querySelectorAll('.dim,.sheet.float').forEach(n=>n.remove());
  if (S.sheet && SHEETS[S.sheet.name]){
    const d = document.createElement('div'); d.className='dim'; d.dataset.a='close';
    const s = document.createElement('div'); s.className='sheet float'; s.dataset.name = S.sheet.name; s.innerHTML = SHEETS[S.sheet.name](S.sheet.params);
    if (same){ s.style.animation = 'none'; d.style.animation = 'none'; }
    $app.appendChild(d); $app.appendChild(s); enableSwipeDown(s, d);
    if (same){ const sc = s.querySelector('.sc'); if (sc) sc.scrollTop = prevScroll; }
  }
  syncBackButton();
}

// ---------- геопозиция и карта ----------
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
function distKm(a, b){ const R = 6371, r = x => x*Math.PI/180; const dLat = r(b.lat-a.lat), dLon = r(b.lon-a.lon);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
const fmtKm = km => km < 1 ? `${Math.round(km*1000)} м` : `${km.toFixed(1).replace('.',',')} км`;
function mapSub(P, create){
  if (P.src==='gps') return 'По GPS' + (P.acc ? ` · точность ±${Math.round(P.acc)} м` : '');
  if (create && S.me) return `Указано вручную · ${fmtKm(distKm(S.me, P))} от вас`;
  if (P.src==='manual') return 'Указано вручную';
  return 'Передвиньте карту, чтобы поставить точку';
}
// Геопозиция: в Telegram — через LocationManager (Bot API 8.0+), в браузере — navigator.geolocation
function locate(cb){
  let fin = false; const done = (r, why) => { if (fin) return; fin = true; if (r) S.me = r; cb(r, why); };
  setTimeout(() => done(null, 'timeout'), 15000);
  try{
    if (tg && tg.LocationManager && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')){
      const LM = tg.LocationManager;
      const ask = () => {
        if (!LM.isLocationAvailable) return done(null, 'unavailable');
        if (LM.isAccessRequested && !LM.isAccessGranted) return done(null, 'denied');
        LM.getLocation(l => l ? done({lat:l.latitude, lon:l.longitude, acc:l.horizontal_accuracy||0}) : done(null, (LM.isAccessRequested && !LM.isAccessGranted) ? 'denied' : 'unavailable'));
      };
      LM.isInited ? ask() : LM.init(ask); return;
    }
    if (navigator.geolocation){ navigator.geolocation.getCurrentPosition(
      p => done({lat:p.coords.latitude, lon:p.coords.longitude, acc:p.coords.accuracy||0}),
      e => done(null, e && e.code===1 ? 'denied' : 'unavailable'), {enableHighAccuracy:true, timeout:12000, maximumAge:60000}); return; }
  }catch(e){}
  done(null, 'unavailable');
}
function locateError(why){
  if (why==='denied') toast('Нет доступа к геолокации. Разрешите её для бота в настройках Telegram — или передвиньте карту вручную.' + (tg && tg.LocationManager ? ' <button class="c-acc" data-a="geo-settings" style="font-weight:600">Открыть настройки</button>' : ''));
  else toast('Не удалось определить местоположение. Передвиньте карту, чтобы поставить точку вручную.');
}
let geoT = 0, geoN = 0;
function reverseGeocode(lat, lon, cb){
  clearTimeout(geoT); const n = ++geoN; const coords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  geoT = setTimeout(() => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=ru`)
      .then(r => r.json()).then(j => { if (n !== geoN) return; const a = j.address || {};
        const city = a.city || a.town || a.village || a.municipality || a.state || '';
        const street = [a.road || a.pedestrian || a.square || a.neighbourhood || a.suburb || a.quarter, a.house_number].filter(Boolean).join(', ');
        cb([city, street].filter(Boolean).join(', ') || coords); })
      .catch(() => { if (n === geoN) cb(coords); });
  }, 500);
}
let LMAP = null, LANCHOR = [];
function killMap(){ if (LMAP){ try{ LMAP.remove(); }catch(e){} LMAP = null; LANCHOR = []; } }
const anchorPoint = () => S.me || S.geo;
const overLimit = () => S.params.mode==='create' && distKm(anchorPoint(), S.mapPoint) > 10;
function checkLimit(){
  const over = overLimit(); const w = document.getElementById('map-warn'); if (w) w.classList.toggle('hidden', !over);
  const b = document.getElementById('map-ok'); if (b) b.disabled = over;
}
function drawAnchor(){
  LANCHOR.forEach(l => { try{ LMAP.removeLayer(l); }catch(e){} }); LANCHOR = [];
  if (!LMAP || S.params.mode!=='create') return; const a = anchorPoint();
  LANCHOR.push(L.circle([a.lat, a.lon], {radius:10000, color:'#0166FF', weight:2, dashArray:'6 6', fillColor:'#0166FF', fillOpacity:.06, interactive:false}).addTo(LMAP));
  if (S.me) LANCHOR.push(L.circleMarker([S.me.lat, S.me.lon], {radius:6, color:'#fff', weight:2, fillColor:'#9AA3B8', fillOpacity:1, interactive:false}).addTo(LMAP));
}
function initMap(){
  killMap(); const box = document.getElementById('mapbox'); if (!box || !window.L) return;
  const P = S.mapPoint; box.classList.add('live');
  S.mapProg = true;
  LMAP = L.map(box, {zoomControl:false, attributionControl:false}).setView([P.lat, P.lon], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(LMAP);
  drawAnchor(); checkLimit();
  if (!P.label) reverseGeocode(P.lat, P.lon, lbl => { S.mapPoint.label = lbl; setText('map-label', lbl); });
  LMAP.on('movestart', () => { if (!S.mapProg) setText('map-label', 'Определяем адрес…'); });
  LMAP.on('moveend', () => {
    const c = LMAP.getCenter(); const prog = S.mapProg; S.mapProg = false;
    if (prog) return;
    S.mapPoint = {lat:c.lat, lon:c.lng, acc:0, src:'manual', label:'Определяем адрес…'};
    setText('map-sub', mapSub(S.mapPoint, S.params.mode==='create')); checkLimit();
    reverseGeocode(c.lat, c.lng, lbl => { S.mapPoint.label = lbl; setText('map-label', lbl); });
  });
}

// ---------- свайп вниз закрывает окно ----------
function enableSwipeDown(sheet, dim){
  let y0 = null, dy = 0, t0 = 0, dragging = false;
  const sc = sheet.querySelector('.sc');
  sheet.addEventListener('touchstart', e => {
    const inGrab = e.target.closest('.grab');
    const atTop = !sc || sc.scrollTop <= 0 || !sc.contains(e.target);
    if (e.target.closest('input,textarea')) return;
    if (inGrab || atTop){ y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); dragging = false; sheet.style.transition = 'none'; }
  }, {passive:true});
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0){ if (dragging){ sheet.style.transform = ''; } return; }
    if (!dragging && sc && sc.scrollTop > 0 && sc.contains(e.target)) { y0 = null; return; }
    dragging = true; e.preventDefault();
    sheet.style.transform = `translateY(${dy}px)`; dim.style.opacity = String(Math.max(0, 1 - dy/400));
  }, {passive:false});
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return; const v = dy / Math.max(1, Date.now()-t0); y0 = null;
    sheet.style.transition = 'transform .2s ease-out'; dim.style.transition = 'opacity .2s';
    if (dragging && (dy > 110 || v > 0.6)){ sheet.style.transform = 'translateY(100%)'; dim.style.opacity = '0'; setTimeout(closeSheet, 190); }
    else { sheet.style.transform = ''; dim.style.opacity = ''; }
    dragging = false;
  });
}

// ---------- действия ----------
const A = {};
A.back = () => back();
A.close = () => closeSheet();
A.go = el => go(el.dataset.to, {});
A['ob-next'] = el => go(el.dataset.to, {}, false);
A['terms-check'] = () => { S.params.ok = !S.params.ok; render(false); };
A['geo-allow'] = () => { toast('Определяем местоположение…');
  locate((r, why) => { if (r) S.mapPoint = {lat:r.lat, lon:r.lon, acc:r.acc, src:'gps', label:''}; else { S.mapPoint = {...S.geo}; locateError(why); }
    go('map', {mode: S.onboarded?'edit':'onboard'}, S.screen!=='map'); if (r) reverseGeocode(r.lat, r.lon, lbl => { S.mapPoint.label = lbl; setText('map-label', lbl); }); }); };
A['map-manual'] = () => { S.mapPoint = {...S.geo, src:'manual'}; go('map', {mode:'onboard'}); };
A['map-edit'] = () => { S.mapPoint = {...S.geo}; go('map', {mode:'edit'}); };
A['draft-geo'] = () => { S.mapPoint = {...S.draft.geo}; go('map', {mode:'create'}); };
A['geo-settings'] = () => { try{ tg && tg.LocationManager && tg.LocationManager.openSettings(); }catch(e){} };
A['map-locate'] = () => { toast('Определяем местоположение…');
  locate((r, why) => { if (!r) return locateError(why);
    S.mapPoint = {lat:r.lat, lon:r.lon, acc:r.acc, src:'gps', label:'Определяем адрес…'};
    if (LMAP){ S.mapProg = true; LMAP.setView([r.lat, r.lon], 16); drawAnchor(); } else render(false);
    setText('map-label', S.mapPoint.label); setText('map-sub', mapSub(S.mapPoint, S.params.mode==='create')); checkLimit();
    reverseGeocode(r.lat, r.lon, lbl => { S.mapPoint.label = lbl; setText('map-label', lbl); }); }); };
A['map-ok'] = () => { const P = {...S.mapPoint}; const mode = S.params.mode;
  if (mode==='create'){ if (overLimit()) return; S.draft.geo = P; S.draft.geoTouched = true; back(); return; }
  S.geo = P; store.set('geo', P);
  if (mode==='onboard' && !S.onboarded) go('tags1', {}, false); else { toast('Точка сохранена'); back(); } };
A.topic = el => { const v = el.dataset.v; S.topics.has(v)?S.topics.delete(v):S.topics.add(v); render(false); };
A.detail = el => { const v = el.dataset.v; S.details.has(v)?S.details.delete(v):S.details.add(v); render(false); };
A['ob-finish'] = () => { S.onboarded = true; store.set('onboarded', true); [...S.topics, ...S.details].forEach(x=>S.subs.add(x)); store.set('subs',[...S.subs]); S.stack=[]; S.screen='main'; S.tab='feed'; render(true); };
A.nav = el => { if (el.dataset.t==='feed') S.feedTab = 'trails'; home(el.dataset.t); };
A.feedtab = el => { S.feedTab = el.dataset.t; render(false); };
A.substab = el => { S.subsTab = el.dataset.t; render(false); };
A.proftab = el => { S.profileTab = el.dataset.t; render(false); };
A['go-subs'] = () => { S.tab='feed'; S.feedTab='subs'; S.stack=[]; S.screen='main'; render(true); };
A.frag = el => { const t = byId(el.dataset.id); const n = t.my.frag + (+el.dataset.d);
  if (n<0) return; if (n>=t.frags.length){ return; } t.my.frag = n; t.my.seen.add(n); t.my.expanded=false; refreshCard(t.id); };
A.expand = el => { const t = byId(el.dataset.id); t.my.expanded = !t.my.expanded; refreshCard(t.id); };
A.tag = el => { const v = el.dataset.tag; const on = !S.subs.has(v); on?S.subs.add(v):S.subs.delete(v); store.set('subs',[...S.subs]); haptic();
  TAGN[v] = Math.max(0, (TAGN[v]||0) + (on?1:-1));
  document.querySelectorAll(`[data-tag="${CSS.escape(v)}"] .n`).forEach(n=>n.textContent = cnt(v));
  document.querySelectorAll(`[data-tag="${CSS.escape(v)}"]`).forEach(n=>n.classList.toggle('sub', on));
  toast(on?`Вы подписались на тег «${esc(v)}»`:`Вы отписались от тега «${esc(v)}»`);
  if (S.screen==='main' && S.feedTab==='subs') render(false); };
A.subscribe = el => { const t = byId(el.dataset.id); t.my.subscribed = !t.my.subscribed; refreshCard(t.id); toast(t.my.subscribed?'Вы подписаны на Тропу — пришлём её дополнения':'Подписка отменена'); };
A.share = el => { const t = byId(el.dataset.id); t.my.shared = true; t.shares++; haptic('medium'); refreshCard(t.id); toast('Тропу получат ещё 12 человек рядом с вами'); };
A.x3d = el => { if (S.restricted) return toast('Буст недоступен в вашей стране. Раздавать Тропу бесплатно можно.'); openSheet('x3d', {id:el.dataset.id, amount:10}); };
A['x3d-amt'] = el => { S.sheet.params.amount = +el.dataset.v; renderSheet(); haptic(); };
A['tip-pick'] = el => { const v = el.dataset.v; const p = S.sheet.params; p.tip = v==='custom' ? 'custom' : (p.tip===+v && v!=='0' ? null : +v); renderSheet(); if (v==='custom'){ const i=document.getElementById('tip-custom'); if(i) i.focus(); } };
A['tip-edit'] = el => { const i = +el.dataset.i, l = S.lots[i]; openSheet('tipEdit', {i, tip:[0,5,10,20].includes(l.tip||0)?(l.tip||0):'custom', tipCustom:[0,5,10,20].includes(l.tip||0)?'':String(l.tip)}); };
A['tip-save'] = () => { const p = S.sheet.params, l = S.lots[p.i]; l.tip = tipValue(p); closeSheet(); render(false); toast(l.tip?`Награда автору: ${l.tip}%`:'Без награды автору'); };
A['x3d-other'] = () => { const p = S.sheet.params; p.other = true; p.amount = +p.otherVal || 0; renderSheet(); const i=document.getElementById('x3d-other-in'); if(i) i.focus(); };
A.resident = () => { S.residentOk = !S.residentOk; renderSheet(); };
A['x3d-pay'] = el => { const id = el.dataset.id, a = S.sheet.params.amount || 10; S.residentDone = true; const tipNow = tipValue(S.sheet.params);
  openSheet('paying', {amount:a});
  setTimeout(()=>{ const t = byId(id); const demos = a*RATE;
    t.my.x3d = {amount:a, demos, viewed:0, fwd:0, at:Date.now()};
    if (!t.my.shared){ t.shares++; t.my.shared = true; } t.x3d++; t.my.subscribed = true;
    const tip = tipNow; t.my.x3d.tip = tip;
    S.lots.push({at:Date.now(), demos, trail:id, title:t.frags[0].text.slice(0,34)+'…', ton:a, author:t.author, tip}); // каждая покупка — отдельно, для комиссии при выводе
    S.myX3d.unshift({title:t.frags[0].text.slice(0,34)+'…', st:'На счёте', info:`${a} TON · NFT получен`, rew:`${fmt(demos)} DEMOS`});
    haptic('heavy'); openSheet('boosted', {id}); refreshCard(id); }, 1400); };
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
A['thank-send'] = el => { const t = byId(el.dataset.id), v = S.sheet.params.v; if (v > balance()) return toast('Недостаточно DEMOS на счёте');
  let left = v; for (let k=S.lots.length-1; k>=0 && left>0; k--){ const take = Math.min(left, S.lots[k].demos); S.lots[k].demos -= take; left -= take; } S.lots = S.lots.filter(l=>l.demos>0); t.my.thanked = true; openSheet('thanked', {id:t.id, v}); };
A.link = el => { const u = el.dataset.v; try{ tg ? tg.openLink(u) : window.open(u,'_blank'); }catch(e){} };
A.menu = el => openSheet('menu', {id:el.dataset.id});
A['report-do'] = () => { closeSheet(); toast('Жалоба отправлена модераторам'); };
A.addtag = el => { const t = byId(el.dataset.id);
  if (t.my.seen.size < t.frags.length) return toast('Сначала досмотрите Тропу до конца — пролистайте все фрагменты');
  openSheet('addtag', {id:t.id, q:''}); };
A['addtag-do'] = el => { const t = byId(el.dataset.id), v = el.dataset.v.trim(); if(!v) return;
  const known = POPULAR_TAGS.find(x=>x[0].toLowerCase()===v.toLowerCase());
  const nm = known?known[0]:v; if (!(nm in TAGN)) TAGN[nm] = 0; t.tags.push([nm, cnt(nm), 1]); t.my.tagAdded = true; closeSheet(); refreshCard(t.id);
  toast(`Тег добавлен. Тропу получат ещё 8 человек — подписчики тега «${esc(known?known[0]:v)}»`); };
A.alltags = el => openSheet('alltags', {id:el.dataset.id});
A['open-trail'] = el => go('trail', {id:el.dataset.id});
A.create = () => {
  if (S.createdToday) return go('limit');
  S.draft = S.draft || {media:[], text:'', tags:[], geo:{...S.geo}};
  go('create1'); if (S.firstTrail) openSheet('firstTrail');
  locate(r => { if (!r || !S.draft || S.draft.geoTouched) return;
    S.draft.geo = {lat:r.lat, lon:r.lon, acc:r.acc, src:'gps', label:'Определяем адрес…'}; setText('draft-geo-label', S.draft.geo.label); setText('draft-geo-sub', 'по GPS');
    reverseGeocode(r.lat, r.lon, lbl => { if (S.draft && !S.draft.geoTouched){ S.draft.geo.label = lbl; setText('draft-geo-label', lbl); } }); });
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
    frags:[{art:'user', text:d.text, url:d.media[0].url, kind:d.media[0].kind}], tags:d.tags.map(x=>{const k=POPULAR_TAGS.find(p=>p[0]===x); return [x,k?k[1]:'0',0];}),
    shares:0, x3d:0, mt:'0 TON', mtOf:0, strength:0, trend:'', comments:0, views:'108', my:{frag:0, seen:new Set([0])}});
  S.createdToday = true; S.createdAt = Date.now(); S.draft = null; S.newId = id; showInFeed(id, 0); openSheet('published'); haptic('heavy'); };
// после создания или дополнения — в ленту, прямо на эту Тропу и на нужный фрагмент
function showInFeed(id, frag){
  const t = byId(id); if (t.own && t.status==='active') t.fresh = true;
  t.my.frag = frag; t.my.seen.add(frag); t.my.expanded = false;
  S.stack = []; S.tab = 'feed'; S.feedTab = 'trails'; S.screen = 'main'; S.params = {}; S.sheet = null; render(true);
  const el = document.querySelector(`[data-card="${id}"]`), feed = document.getElementById('feed');
  if (el && feed){ feed.scrollTop = el.offsetTop - feed.offsetTop; S.feedTop = feed.scrollTop; }
}
A['see-mine'] = () => closeSheet();
A.addition = el => go('addition', {id:el.dataset.id});
A['addition-do'] = el => { const t = byId(el.dataset.id); const txt = (document.querySelector('[data-input="addtext"]')||{}).value||'';
  const m = S.params.addMedia;
  if (!txt.trim() && !m) return toast('Добавьте фото, видео или текст');
  t.frags.push({art:t.frags[t.frags.length-1].art, text:txt.trim(), url:m?m.url:undefined, kind:m?m.kind:undefined}); S.lastAddAt = Date.now();
  showInFeed(t.id, t.frags.length-1); toast('Тропа дополнена. Подписчики получат уведомление'); };
A.toast = el => toast(el.dataset.m);
A.reset = () => { try{localStorage.removeItem('demos_onboarded');}catch(e){} S.onboarded=false; S.stack=[]; go('splash',{},false); setTimeout(()=>{ if (S.screen==='splash') go('ob1',{},false); },1800); };
A.saved = () => { toast('Профиль сохранён'); back(); };
A.copy = () => { try{ navigator.clipboard.writeText('https://t.me/demos_bot?start=marsaon'); }catch(e){} toast('Ссылка скопирована'); };
A.ton = () => { S.wallet.ton = S.wallet.ton ? null : 'UQB…3fA2'; render(false); toast(S.wallet.ton?'Кошелёк подключён (тест)':'Кошелёк отключён'); };
A['withdraw-do'] = () => { if (!S.wallet.ton){ S.wallet.ton='UQB…3fA2'; render(false); return toast('Кошелёк подключён (тест)'); }
  const out = netOut(); S.lots = []; S.myX3d.forEach(x=>{ if (x.st==='На счёте') x.st='Выведено'; }); toast(`Отправлено ${fmt(out)} DEMOS на кошелёк (тест)`); back(); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || !$app.contains(el)) return;
  const fn = A[el.dataset.a]; if (fn){ e.preventDefault(); fn(el); }
});
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.input; if (!k) return;
  if (k==='text'){ S.draft.text = e.target.value; const c = document.getElementById('cnt'); if(c) c.textContent = `${S.draft.text.length}/1200`; const b = document.getElementById('next1'); if (b) b.disabled = !(S.draft.media.length && S.draft.text.trim()); }
  if (k==='ctag' || k==='tagsearch'){ S.params.q = e.target.value; clearTimeout(S._qt); S._qt = setTimeout(()=>{ const pos = e.target.selectionStart; render(false); const i = document.querySelector(`[data-input="${k}"]`); if(i){ i.focus(); try{i.setSelectionRange(pos,pos);}catch(_){} } }, 250); }
  if (k==='tip-custom'){ const clean = e.target.value.replace(/\D/g,'').slice(0,3); if (clean!==e.target.value) e.target.value = clean; S.sheet.params.tipCustom = String(Math.min(100, +clean||0) || ''); }
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
  if (k==='media' || k==='addmedia') handleMedia(k, [...(e.target.files||[])]);
});

// Копия файла в памяти приложения. На Android доступ к файлу из галереи временный:
// когда выбираешь следующий файл, ссылка на предыдущий может перестать работать — и картинка становится чёрной.
async function ownURL(file){ try{ const buf = await file.arrayBuffer(); return URL.createObjectURL(new Blob([buf], {type: file.type || 'application/octet-stream'})); }catch(e){ return URL.createObjectURL(file); } }
function videoMeta(url){ return new Promise(res => { const v = document.createElement('video'); v.preload='metadata'; v.muted = true; v.src = url;
  v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(null); setTimeout(()=>res(-1), 8000); }); }
const durStr = d => `${Math.floor(d/60)}:${String(Math.round(d%60)).padStart(2,'0')}`;
async function handleMedia(k, files){
  if (!files.length) return;
  const keepText = () => { const ta = document.querySelector('[data-input="addtext"]'); if (ta) S.params.addText = ta.value; };
  const f = files[0];
  if (f.type.startsWith('video')){
    const url = await ownURL(f); const d = await videoMeta(url);
    if (d === null) return toast('Не удалось открыть видео — попробуйте другой файл');
    if (d > 180) return toast('Видео длиннее 3 минут — обрежьте или выберите другое');
    const m = {url, kind:'video', dur: d > 0 ? durStr(d) : ''};
    if (k==='media') S.draft.media = [m]; else { keepText(); S.params.addMedia = m; }
  } else {
    if (k==='media') S.draft.media = await Promise.all(files.slice(0,10).map(async x => ({url: await ownURL(x), kind:'photo'})));
    else { keepText(); S.params.addMedia = {url: await ownURL(f), kind:'photo'}; }
  }
  render(false);
}

// ---------- видео в ленте: звук и воспроизведение только у видимой Тропы ----------
S.sound = true;
const ICON_SND_ON = '<svg viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h4l6-5v16l-6-5H4z"/><path d="M18 9a5 5 0 0 1 0 8M21 6a9 9 0 0 1 0 14"/></svg>';
const ICON_SND_OFF = '<svg viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h4l6-5v16l-6-5H4z"/><path d="M18 10l6 6M24 10l-6 6"/></svg>';
function soundButtons(){
  document.querySelectorAll('[data-a="sound"]').forEach(b => { const muted = !S.sound || S.soundBlocked; b.innerHTML = (muted?ICON_SND_OFF:ICON_SND_ON) + `<span>${muted?'Звук выкл.':'Звук'}</span>`; });
}
function currentCard(){
  const feed = document.querySelector('.feed'); if (!feed) return null;
  const cards = [...feed.querySelectorAll('[data-card]')]; const fr = feed.getBoundingClientRect();
  let best = null, bestV = 0;
  cards.forEach(c => { const r = c.getBoundingClientRect(); const v = Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top); if (v > bestV){ bestV = v; best = c; } });
  return best;
}
function syncVideos(){
  const cur = currentCard();
  document.querySelectorAll('.feed video.slide').forEach(v => {
    const active = cur && cur.contains(v);
    if (!active){ v.muted = true; try{ v.pause(); }catch(e){} return; }
    v.muted = !S.sound;
    const p = v.play(); if (p && p.catch) p.then(()=>{ if (S.sound){ S.soundBlocked = false; soundButtons(); } }).catch(() => { v.muted = true; S.soundBlocked = S.sound; v.play().catch(()=>{}); soundButtons(); });
  });
  soundButtons();
}
let feedScrollT = 0;
document.addEventListener('scroll', e => { if (e.target && e.target.classList && e.target.classList.contains('feed')){ clearTimeout(feedScrollT); feedScrollT = setTimeout(syncVideos, 120); } }, true);
A.sound = () => { if (S.soundBlocked){ S.sound = true; S.soundBlocked = false; } else S.sound = !S.sound; syncVideos(); haptic(); };

// ---------- старт ----------
if (tg){ try{ tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#11151F'); tg.setBackgroundColor && tg.setBackgroundColor('#11151F'); tg.BackButton.onClick(back); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); }catch(e){} }
try{ const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param; if (sp && !store.get('invitedBy', null)) store.set('invitedBy', {code: String(sp).replace(/^ref_/,''), at: new Date().toISOString()}); }catch(e){}
S.screen = S.onboarded ? 'main' : 'splash';
render(true);
if (!S.onboarded) setTimeout(()=>{ if (S.screen==='splash') go('ob1', {}, false); }, 1800);
window.DEMOS = {S, reset(){ try{localStorage.removeItem('demos_onboarded');}catch(e){} location.reload(); }};
})();
