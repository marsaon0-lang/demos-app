// DEMOS Mini App v0 — кликабельная версия на тестовых данных
(function(){
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const WEB = !!window.DEMOS_WEB; // веб-версия (отдельная от Telegram)
const store = {
  get(k,d){ try{ const v = localStorage.getItem('demos_'+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('demos_'+k, JSON.stringify(v)); }catch(e){} }
};
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
// валюта (решено 23.10): веб-версия — SOL (0,01 / 0,1 / 1), Telegram — TON (1 / 10 / 100). Внутри суммы хранятся в «единицах» (1 / 10 / 100), на экране — в валюте версии
// Telegram-версия — на очках (решено 24.10): без денег, токена и вывода; очки дают при входе и за раздачи, тратятся на X3D и благодарности
const PTS = !WEB;
const CUR = WEB ? 'SOL' : 'очков', CURK = WEB ? 0.01 : 10;
const numRu = n => { const r = Math.round(n*1000)/1000; return Math.abs(r) >= 1000 ? fmt(r) : String(r).replace('.',','); };
const cur = n => PTS ? fmt(Math.round(n*CURK)) + ' очков' : numRu(n*CURK) + ' ' + CUR;
const rateLine = r => `1 ${CUR} = ${fmt(r/CURK)} DEMOS`;
const curText = s => String(s).replace(/(\d[\d\s]*(?:,\d+)?)\s?TON/g, (m, n) => cur(parseFloat(n.replace(/\s/g,'').replace(',','.'))));
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
  residentOk: false, sentThanks: [], rate: 300, rateAt: Date.now(), firstTrail: true, createdToday: false, lastAddAt: 0,
  wallet: {ton:null},
  // счёт DEMOS: каждая покупка X3D — отдельная партия со своей датой (стейкинг считается по каждой партии)
  lots: [{at:Date.now()-15.2*86400000, demos:3000, title:'Пропал пёс Рони', ton:10, author:'boris', tip:5, k:1.46},{at:Date.now()-4.3*86400000, demos:1500, title:'Прорвало трубу на Профсоюзной', ton:5, author:'dom43_profsoyuznaya', tip:0, k:0.88, settledAt:Date.now()-1.3*86400000},{at:Date.now()-0.6*86400000, demos:300, title:'Перекрыли полосы на Пироговской', ton:1, author:'semyon_p', tip:10, k:0.74, settledAt:Date.now()-0.2*86400000}], // демо: Тропы уже завершились, коэффициент известен
  myX3d: [{title:'Пропал пёс Рони', st:'На счёте', info:'10 TON', rew:'3 000 DEMOS'},{title:'Прорвало трубу на Профсоюзной', st:'На счёте', info:'5 TON', rew:'1 500 DEMOS'},{title:'Перекрыли полосы на Пироговской', st:'На счёте', info:'1 TON', rew:'300 DEMOS'}],
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
  return `<button class="mt" data-a="mt" data-id="${t.id}" style="width:100%;text-align:left"><span class="lbl">Money Trust</span><span class="val">${mtText(t)}</span><span class="share">${mtTri(t.mtOf)}<b>${t.mtOf} из 100</b><span class="of">выбирают X3D</span></span><span class="info-i">i</span></button>`;
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
  if (m.x3d && PTS && m.x3d.before != null) return `<div class="actions"><div class="part" data-boostcard="${t.id}">${ptsBlock(t)}</div></div>`;
  if (m.x3d && !PTS && m.x3d.lot) return `<div class="actions"><div class="part" data-webcard="${t.id}">${webBlock(t)}</div></div>`;
  if (m.x3d){
    const x = m.x3d;
    return `<div class="actions"><div class="part">
      <div class="top"><span class="strong">Вы поддержали Тропу</span>${strengthHTML(t.strength,t.trend)}</div>
      <div class="top"><span class="heading">${PTS ? ptsN(x.pts||Math.round(x.amount*CURK)) : `+${fmt(x.demos)} DEMOS`}</span><button class="mt-mini" data-a="mt" data-id="${t.id}"><span class="c-sec">${PTS?'X3D':cur(x.amount)} ·</span>${mtTri(t.mtOf)}<b>${t.mtOf} из 100</b></button></div>
    </div></div>`;
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

SCREENS.splash = () => `<div class="screen" style="justify-content:center;align-items:center" data-a="ob-next" data-to="${WEB?'invited':'ob1'}">
  <div style="display:flex;flex-direction:column;align-items:center;margin-top:-40px">${I.logo}<div class="wordmark" style="font-size:34px;margin-top:30px">DEMOS</div><div class="body" style="letter-spacing:.04em;margin-top:10px">Биржа правды</div></div>
  <div class="caption c-sec" style="position:absolute;bottom:calc(40px + var(--safe-bottom));font-size:12px">«Мнение без равной конкуренции ничего не стоит»</div></div>`;

const obSlide = (i, big, title, text, next) => `<div class="screen">
  <div style="display:flex;justify-content:flex-end;padding:8px 16px"><button class="caption c-sec" data-a="ob-next" data-to="terms">Пропустить</button></div>
  <div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:16px">
    <div style="height:220px;border-radius:24px;background:var(--bg-surface);display:grid;place-items:center"><div class="title" style="font-size:40px">${big}</div></div>
    <div class="title">${title}</div><div class="body c-sec">${text}</div></div>
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom));display:flex;flex-direction:column;gap:16px"><div class="dots"><i class="${i===1?'on':''}"></i><i class="${i===2?'on':''}"></i><i class="${i===3?'on':''}"></i></div><button class="btn primary" data-a="ob-next" data-to="${next}">Далее</button></div></div>`;
SCREENS.ob1 = () => obSlide(1,'108','Правду разносят люди','В DEMOS нет подписок на людей и поиска Троп. Новую Тропу сразу получают 108 человек рядом и по тегам, дальше — по 12 за каждое «Раздать». Важное доходит само.','ob2');
SCREENS.ob2 = () => obSlide(2,'12 → 36','X3D — буст для важного',`Если Тропа важна, усильте её: X3D доставит её 36 людям вместо 12. ${PTS?'В Telegram-версии буст — на очках: их дают при входе и за раздачи.':'Вся сумма превращается в DEMOS и остаётся на вашем счёте.'}`,'terms');
SCREENS.terms = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:14px">
  <div class="title">Прежде чем начать</div>
  <div class="body c-sec">DEMOS работает по правилам: без подписок на людей, одна новая Тропа в день, опубликованные Тропы не удаляются, незаконный контент модерируется.</div>
  ${['Условия использования','Политика конфиденциальности','Правила сообщества'].map(x=>`<div class="kv"><span>${x}</span><span class="c-acc caption">Открыть</span></div>`).join('')}
  <div class="check ${S.params.ok?'on':''}" data-a="terms-check"><span class="bx"></span><span>Я принимаю Условия использования, Политику конфиденциальности и Правила сообщества</span></div></div>
  <div class="pad" style="padding-bottom:calc(24px + var(--safe-bottom))"><div class="dots" style="margin-bottom:16px"><i></i><i></i><i class="on"></i></div><button class="btn primary" data-a="ob-next" data-to="${WEB?webAfterTerms():'geo'}" ${S.params.ok?'':'disabled'}>Принять и продолжить</button></div></div>`;
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
SCREENS.notif = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:14px;text-align:center">
  <div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">🔔</div>
  <div class="title">Включите уведомления</div>
  <div class="body c-sec">Узнаете сразу, когда вам раздали Тропу рядом, когда в Тропе из ваших подписок появилось дополнение и когда вас поблагодарили.</div>
  <div class="caption c-mut">Выключить можно в любой момент в «О DEMOS» или в настройках браузера.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom));display:flex;flex-direction:column;gap:8px"><button class="btn primary" data-a="ob-notif">Включить уведомления</button><button class="btn ghost" data-a="ob-later">Позже</button></div></div>`;
// ---------- веб-онбординг (решено 23.10, только веб-версия): вход только по приглашению, обязательные установка, уведомления, геопозиция ----------
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
// ссылка-приглашение: в вебе — на веб-версию с ?ref=, в Telegram — на бота
const refLink = () => WEB ? (location.origin + location.pathname + '?ref=' + REFERRAL.code) : 'https://' + REFERRAL.link;
const refLinkShort = () => refLink().replace(/^https?:\/\//,'');
// Android-приложение (APK, 24.10): веб-версия внутри приложения — без баннера установки, системная «Назад» листает экраны
const ANDROID_APP = /DEMOSAndroid/.test(navigator.userAgent);
window.DEMOS_BACK = () => { if (S.sheet || S.stack.length){ back(); return true; } return false; };
const isStandalone = () => { try{ return ANDROID_APP || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }catch(e){ return false; } };
let installEvt = null;
if (WEB){ window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S.screen==='install') render(false); });
  window.addEventListener('appinstalled', () => { if (S.screen==='install') go('opened', {}, false); else if (S.screen==='main') render(false); }); }
// установка — необязательна (решено 23.10): предлагается баннером в ленте; уведомления — обязательны там, где браузер их поддерживает (на iPhone — только после установки)
const webAfterTerms = () => (typeof Notification!=='undefined') ? 'notifReq' : 'geoReq';
const showInstallBanner = () => WEB && !isStandalone() && (Date.now() - (store.get('installHideAt', 0)||0) > 3*86400000);
const installBanner = () => !showInstallBanner() ? '' : `<div class="install-banner"><span style="font-size:22px">📲</span><div style="flex:1;min-width:0"><div class="strong">Установите DEMOS</div><div class="caption c-sec">${isIOS?'Уведомления на iPhone приходят только после установки':'Запуск с главного экрана и уведомления'}</div></div><button class="badge acc" style="height:30px" data-a="install-open">Установить</button><button class="c-mut" style="padding:4px 2px 4px 6px;font-size:18px" data-a="install-hide" aria-label="Скрыть">✕</button></div>`;
const inviteCode = () => (store.get('invitedBy', null) || {}).code || '';
const obPage = (icon, title, body, actions, extra='') => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;gap:14px;text-align:center">
  <div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">${icon}</div><div class="title">${title}</div><div class="body c-sec">${body}</div>${extra}</div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom));display:flex;flex-direction:column;gap:8px">${actions}</div></div>`;
SCREENS.invite = () => obPage('🔒','DEMOS — только по приглашению', isStandalone()&&isIOS ? 'Вставьте код приглашения ещё раз — приложение на экране «Домой» не видит то, что было в Safari.' : 'Попросите ссылку у друга, который уже в DEMOS, или вставьте код приглашения.',
  `<button class="btn primary" data-a="invite-go">Продолжить</button><button class="btn ghost" data-a="login-existing">У меня уже есть аккаунт</button>`,
  `<div class="field" style="text-align:left"><input id="invite-in" placeholder="Ссылка или код приглашения" autocapitalize="off" autocomplete="off"></div><div class="caption c-warn hidden" id="invite-err">Не похоже на ссылку или код приглашения</div>`);
SCREENS.invited = () => obPage('🤝', `Вас пригласил @${esc(inviteCode())}`, 'DEMOS — биржа правды. Тропы приходят людям рядом и расходятся, только если их раздают. Дальше — уведомления и геопозиция: без них DEMOS не работает.',
  `<button class="btn primary" data-a="ob-next" data-to="login">Продолжить</button>`);
// Вход через Telegram (решено 24.10; веб-версия). Пока без сервера — тестовый вход. Настоящий: кнопка Telegram, данные проверяет сервер токеном бота
SCREENS.login = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;text-align:center">
  <div class="app-icon">${I.logo}</div><div class="caption c-sec" style="margin-top:-6px">DEMOS</div>
  <div class="title">${S.params.existing?'Войдите в свой аккаунт':'Вход в DEMOS'}</div>
  <div class="body c-sec">Без паролей — через ваш Telegram. ${S.params.existing?'Тропы, подписки и счёт вернутся на этом устройстве.':'Аккаунт DEMOS будет привязан к нему.'}</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom));display:flex;flex-direction:column;gap:10px">
  <button class="btn primary" data-a="tg-login">Войти через Telegram</button>
  <div class="fine c-mut center">DEMOS получит из Telegram имя, ник и фото. Номер телефона не передаётся.${S.params.existing?'':' Ник будет виден другим в DEMOS.'}</div></div></div>`;
SCREENS.install = () => isIOS
  ? obPage('📲','Добавьте DEMOS на экран «Домой»','Так DEMOS открывается с главного экрана, как обычное приложение, и надёжнее приходят уведомления.',
    `<button class="btn primary" data-a="install-ios">Я добавил — открыть с экрана «Домой»</button><button class="btn ghost" data-a="back">Позже</button>`,
    `<div class="box" style="text-align:left;display:flex;flex-direction:column;gap:8px"><div class="body">1. Нажмите «Поделиться» внизу Safari</div><div class="body">2. Выберите «На экран Домой»</div><div class="body">3. Нажмите «Добавить» и откройте DEMOS с главного экрана</div></div><div class="caption c-mut">Ваш код приглашения: <b class="nick">${esc(inviteCode())}</b> — если попросят, введите его.</div>`)
  : obPage('📲','Установите DEMOS на телефон','Так DEMOS открывается с главного экрана, как обычное приложение, и надёжнее приходят уведомления.',
    (installEvt ? `<button class="btn primary" data-a="install-do">Установить приложение</button>` : `<button class="btn primary" data-a="install-manual">Я установил — открыть с главного экрана</button>`) + `<button class="btn ghost" data-a="back">Позже</button>`,
    installEvt ? '' : `<div class="box" style="text-align:left;display:flex;flex-direction:column;gap:8px"><div class="body">1. Откройте меню браузера ⋮</div><div class="body">2. Нажмите «Установить приложение» или «Добавить на главный экран»</div><div class="body">3. Откройте DEMOS с главного экрана</div></div>`);
SCREENS.opened = () => `<div class="screen"><div class="scroll pad" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;text-align:center">
  <div class="app-icon">${I.logo}</div><div class="caption c-sec" style="margin-top:-6px">DEMOS</div>
  <div class="title">Готово — DEMOS на главном экране</div><div class="body c-sec">Иконка DEMOS (белый треугольник) появилась на главном экране. Дальше открывайте приложение с неё.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))"><button class="btn ghost" data-a="back">Вернуться в ленту</button></div></div>`;
SCREENS.notifReq = () => obPage('🔔','Включите уведомления','Так вы узнаете, когда вам раздали Тропу рядом, когда в Тропе из ваших подписок появилось дополнение и когда вас поблагодарили. Без уведомлений DEMOS не работает.',
  `<button class="btn primary" data-a="notif-req">Включить уведомления</button>`);
SCREENS.notifOff = () => obPage('⚠️','Уведомления выключены', isIOS ? 'Чтобы продолжить, разрешите уведомления: Настройки → Уведомления → DEMOS. Затем вернитесь сюда.' : 'Чтобы продолжить, разрешите уведомления для DEMOS: нажмите на значок слева от адреса или откройте Настройки → Приложения → DEMOS → Уведомления. Затем вернитесь сюда.',
  `<button class="btn primary" data-a="notif-check">Я разрешил — проверить</button>`);
SCREENS.geoReq = () => obPage('📍','Разрешите геопозицию','DEMOS работает от вашей точки: Тропы приходят от неё — сначала самым ближним. Другие видят только расстояние до Тропы, а не саму точку.',
  `<button class="btn primary" data-a="geo-req">Разрешить геопозицию</button>`);
SCREENS.geoOff = () => obPage('⚠️','Геопозиция выключена','Чтобы продолжить, разрешите доступ к местоположению для DEMOS в настройках телефона или браузера, затем вернитесь сюда.',
  `<button class="btn primary" data-a="geo-req">Я разрешил — проверить</button>`);
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
  return `<div class="screen">${header}${S.feedTab==='trails'?installBanner():''}${body}${bottomNav()}</div>`;
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
    <div class="seg"><button class="${S.profileTab==='trails'?'on':''}" data-a="proftab" data-t="trails">Мои Тропы</button><button class="${S.profileTab==='wallet'?'on':''}" data-a="proftab" data-t="wallet">${PTS?'Очки':'Кошелёк'}</button></div></div>`;
  const body = S.profileTab==='trails' ? myTrailsHTML() : walletHTML();
  return `<div class="screen"><div class="scroll">${head}${body}</div>${bottomNav()}</div>`;
}
function myTrailsHTML(){
  return `<div class="pad">${S.myTrails.map(t=>`<div class="list-item"><button class="thumb" style="background-image:${mediaBG(t.frags[0])}" data-a="open-trail" data-id="${t.id}">${thumbInner(t.frags[0])}</button>
    <div style="flex:1;min-width:0" data-a="open-trail" data-id="${t.id}"><div class="strong" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.frags[0].text)}</div>
    <div style="margin-top:4px">${t.status==='finished'?'<span class="badge mut">Тропа завершена</span>':strengthHTML(t.strength,t.trend)}</div>
    <div class="caption c-sec">${fmt(t.shares)} раздали · ${t.x3d} X3D · ${mtText(t)} Money Trust</div></div>
    ${t.status==='active'?`<button class="badge acc" style="height:30px" data-a="addition" data-id="${t.id}">Дополнить</button>`:''}</div>`).join('')}
    <div class="caption c-mut" style="padding:14px 0 24px">Свои Тропы — только здесь. В «Подписках» — чужие Тропы.</div></div>`;
}
// вывод: комиссия 6%. Стейкинг (решено основателем 25.10, заменяет «через 14 дней»): после завершения Тропы итог покупки
// разблокируется за 3 дня равными долями — первая треть сразу, вторая через сутки, третья через двое суток. То же у автора.
// В тестовой версии «сутки» = 1 минута (чтобы было видно, как разблокируется).
const LOCK_DAYS = 14, FEE = 6, VEST_DAYS = 3;
const vestFrac = (start, test) => start ? Math.min(1, (Math.floor((Date.now()-start)/(test?60000:86400000))+1)/VEST_DAYS) : 1;
const vestNext = (start, test) => { if (!start) return 0; const d = test?60000:86400000, n = Math.floor((Date.now()-start)/d)+1; return n >= VEST_DAYS ? 0 : start + n*d - Date.now(); };
const daysHeld = l => Math.floor((Date.now()-l.at)/86400000);
const daysLeft = l => Math.max(0, LOCK_DAYS - daysHeld(l));
// полная версия, вариант A: DEMOS покупки = DEMOS при покупке × коэффициент Тропы; после завершения Тропы — стейкинг 3 дня
const lotK = l => l.settled !== false ? (l.k || 1) : (() => { const t = byId(l.trail); return t ? kaCoef(trailVol(t), l.before, l.ton) : 1; })();
const lotDemos = l => Math.round(l.demos * lotK(l));
const lotLeft = l => Math.max(0, lotDemos(l) - (l.withdrawn||0));                       // ещё на счёте
const lotUnlocked = l => l.settled === false ? 0 : Math.round(lotDemos(l) * vestFrac(l.settledAt, l.test));
const lotAvail = l => Math.max(0, lotUnlocked(l) - (l.withdrawn||0));                   // можно вывести сейчас
const lotLocked = l => l.settled === false ? 0 : Math.max(0, lotDemos(l) - lotUnlocked(l)); // в стейкинге
const canOut = l => lotAvail(l) > 0;
const balance = () => S.lots.reduce((a,l)=>a+lotLeft(l),0);
const availTotal = () => S.lots.reduce((a,l)=>a+lotAvail(l),0), lockedTotal = () => S.lots.reduce((a,l)=>a+lotLocked(l),0), liveTotal = () => S.lots.reduce((a,l)=>a+(l.settled===false?lotDemos(l):0),0);
// очки Telegram-версии: стартовые и за раздачу — параметры (числа — предложение Claude 24.10, меняются в админке)
const PTS_START = 1000, PTS_SHARE = 10;
if (PTS){ S.pts = store.get('pts', null) || {bal:PTS_START, log:[{at:Date.now(), text:'Стартовые очки', d:PTS_START}]}; }
const ptsBal = () => PTS ? S.pts.bal : 0;
const ptsAdd = (d, text) => { S.pts.bal += d; S.pts.log.unshift({at:Date.now(), text, d}); S.pts.log = S.pts.log.slice(0,50); store.set('pts', S.pts); };
const ptsWord = n => { const a=Math.abs(n)%100, b=a%10; return (a>10&&a<20)?'очков':b===1?'очко':(b>=2&&b<=4)?'очка':'очков'; };
const ptsN = n => `${fmt(n)} ${ptsWord(n)}`;
// Коэффициент X3D — ВАРИАНТ A (решено основателем 25.10; одинаково в Telegram на очках и в полной версии на DEMOS).
// Замкнутая Тропа, без резерва: всё, что выплачивается, — ровно общая сумма X3D Тропы. Прибыль первых = убыток последних.
// Кривая по доле в объёме X3D Тропы: k(доля) = 0,7 + 1,3 × (1 − доля)^P, P = 10/3 (подобрано так, что средний k = 1).
// Выплата покупки = объём × (F(доля после) − F(доля до)), F — первообразная k. Точно при любых суммах; один покупатель получает свою сумму.
// Итог — при завершении Тропы; пока Тропа жива, показывается текущая оценка (растёт, когда после вас покупают).
const KA_MIN = 0.7, KA_MAX = 2.0, KA_P = (KA_MAX-KA_MIN)/(1-KA_MIN) - 1;
const kaF = s => KA_MIN*s - (KA_MAX-KA_MIN)*Math.pow(1-s, KA_P+1)/(KA_P+1);
const kaPay = (vol, before, amt) => { if (!(amt > 0)) return 0; if (!(vol > 0)) return amt; const s0 = Math.min(1, before/vol), s1 = Math.min(1, (before+amt)/vol); return vol*(kaF(s1)-kaF(s0)); };
const kaCoef = (vol, before, amt) => amt > 0 ? kaPay(vol, before, amt)/amt : 1;
const COEF_MAX = KA_MAX, COEF_MIN = KA_MIN;
const coefStr = c => '×' + (Math.round(c*100)/100).toFixed(2).replace('.',',');
const trailVol = t => { if (t.vol == null) t.vol = Math.round((parseFloat(String(t.mt||'0').replace(/[^\d,]/g,'').replace(',','.'))||0)*(PTS?CURK:1)); return t.vol; }; // Telegram — очки; полная версия — единицы (1 = 0,01 SOL)
const mtText = t => PTS ? ptsN(trailVol(t)) : cur(trailVol(t));
const xCoef = (t,x) => x.paid ? x.coefFinal : kaCoef(trailVol(t), x.before, x.pts);
const xNow = (t,x) => x.paid ? x.paid : Math.round(kaPay(trailVol(t), x.before, x.pts));
const xMin = x => Math.round(COEF_MIN*x.pts), xMax = x => Math.round(COEF_MAX*x.pts);
const xAfter = (t,x) => Math.max(0, trailVol(t) - x.before - x.pts);
const xTip = (t,x) => Math.round(xNow(t,x)*(x.tip||0)/100);
const TEST_CLOSE_MIN = 3; // тест: Тропа «завершается» через 3 минуты после вашей покупки (в рабочей версии — по правилу 1, срок скрыт)
function coefBar(t, x, compact){ const c = xCoef(t,x), pct = Math.round((c-COEF_MIN)/(COEF_MAX-COEF_MIN)*100);
  return `<div style="display:flex;flex-direction:column;gap:6px">
    <div class="caption" style="display:flex;justify-content:space-between"><span class="c-sec">Коэффициент</span><span class="strong">${coefStr(c)}</span></div>
    <div class="prog"><i style="width:${Math.max(2,pct)}%"></i></div>
    <div class="caption c-mut" style="display:flex;justify-content:space-between"><span>×0,7 · ${fmt(xMin(x))}</span><span>×2,0 · ${fmt(xMax(x))}</span></div>
    ${compact?'':`<div class="caption c-sec">После вас купили X3D на ${ptsN(xAfter(t,x))}. Чем больше купят после вас, тем выше коэффициент</div>`}
    <div class="caption ${x.paid?'c-suc':'c-sec'}">${x.paid?`Итог ${ptsN(x.paid - (x.tipPaid||0))}${x.tipPaid?` · автору ${ptsN(x.tipPaid)}`:''} · Тропа завершилась · стейкинг 3 дня, по трети в день`:`Сейчас ${ptsN(xNow(t,x))} · растёт, когда после вас покупают X3D`}</div></div>`; }
function kaBarHTML(k, base, now, compact){ const pct = Math.round((k-KA_MIN)/(KA_MAX-KA_MIN)*100);
  return `<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
    <div class="caption" style="display:flex;justify-content:space-between"><span class="c-sec">Коэффициент</span><span class="strong">${coefStr(k)}</span></div>
    <div class="prog"><i style="width:${Math.max(2,pct)}%"></i></div>
    <div class="caption c-mut" style="display:flex;justify-content:space-between"><span>×0,7 · ${fmt(Math.round(base*KA_MIN))}</span><span>×2,0 · ${fmt(Math.round(base*KA_MAX))}</span></div>
    ${compact?'':`<div class="caption c-sec">Сейчас ${fmt(now)} DEMOS · растёт, когда после вас покупают X3D</div>`}</div>`; }
const hhmm = ms => { const m = Math.ceil(ms/60000), h = Math.floor(m/60); return h ? (m%60 ? `${h} ч ${m%60} мин` : `${h} ч`) : `${m} мин`; };
const closeLeft = x => Math.max(0, x.closeAt - Date.now());
// блок под Тропой после X3D (Telegram): сколько очков даёт буст сейчас — как «+N DEMOS» в полной версии
function webBlock(t){ const l = t.my.x3d.lot, k = lotK(l), live = l.settled === false;
  return `<div class="top"><span class="strong">Вы поддержали Тропу</span>${strengthHTML(t.strength,t.trend)}</div>
    <div class="top"><span class="heading ${live?'':'c-suc'}">+${fmt(lotDemos(l))} DEMOS</span><button class="mt-mini" data-a="mt" data-id="${t.id}"><span class="c-sec">${cur(l.ton)} ·</span>${mtTri(t.mtOf)}<b>${t.mtOf} из 100</b></button></div>
    <div class="caption c-sec">№${l.n||t.x3d} · после вас купили на ${cur(Math.max(0, trailVol(t)-l.before-l.ton))} · вы подписаны на Тропу</div>
    ${kaBarHTML(k, l.demos, lotDemos(l), true)}
    <div class="caption c-mut">${live?`Итог — когда Тропа завершится (в тестовой версии — через ${hhmm(Math.max(0,(l.closeAt||0)-Date.now()))})`:'Тропа завершилась · итог зафиксирован'}</div>`; }
function ptsBlock(t){ const x = t.my.x3d;
  return `<div class="top"><span class="strong">Вы поддержали Тропу</span>${strengthHTML(t.strength,t.trend)}</div>
    <div class="top"><span class="heading ${x.paid?'c-suc':''}">+${ptsN(xNow(t,x))}</span><button class="mt-mini" data-a="mt" data-id="${t.id}"><span class="c-sec">${ptsN(x.pts)} ·</span>${mtTri(t.mtOf)}<b>${t.mtOf} из 100</b></button></div>
    <div class="caption c-sec">№${x.n} · после вас купили на ${ptsN(xAfter(t,x))} · вы подписаны на Тропу</div>
    ${coefBar(t, x, true)}
    ${x.paid?'':`<div class="caption c-mut">Итог — когда Тропа завершится (в тестовой версии — через ${hhmm(closeLeft(x))})</div>`}`; }
const KA_TEXT = 'Всё, что выплачивается за буст, — это общая сумма X3D Тропы, без добавок: сколько первые получают сверх своего, столько недополучают последние. Коэффициент зависит от вашей доли в объёме X3D Тропы: в самом начале ×2,0; 10% — ×1,61; 20% — ×1,32; 30% — ×1,10; 40% — ×0,94; 50% — ×0,83; 60% — ×0,76; 70% и дальше — около ×0,7. Пример: 10 человек по 100 получат 180, 146, 120, 101, 88, 79, 74, 71, 70, 70 — ровно 1 000. Если вы один — получите своё обратно. Итог — когда Тропа завершится.';
// стейкинг очков (Telegram, как в полной версии): итог буста разблокируется за 3 дня — по трети в день; в тесте сутки = 1 минута
const ptsLocked = () => PTS ? (S.pts.vest||[]).reduce((a,v)=>a+(v.total-v.got),0) : 0;
function ptsVest(total, text){ S.pts.vest = S.pts.vest || []; S.pts.vest.push({total, got:0, start:Date.now(), test:true, text}); releaseVested(); }
function releaseVested(){ if (!PTS || !S.pts.vest || !S.pts.vest.length) return false; let moved = false;
  S.pts.vest.forEach(v => { const due = Math.round(v.total*vestFrac(v.start, v.test)) - v.got; if (due > 0){ v.got += due; S.pts.bal += due; S.pts.log.unshift({at:Date.now(), text:'Стейкинг · ' + v.text, d:due}); moved = true; } });
  S.pts.vest = S.pts.vest.filter(v => v.got < v.total); if (moved){ S.pts.log = S.pts.log.slice(0,50); store.set('pts', S.pts); } return moved; }
if (PTS) setInterval(() => { if (releaseVested() && !S.sheet && S.screen==='main' && S.tab==='profile') render(false); }, 5000);
const ptsLack = need => `Не хватает очков: у вас ${ptsN(ptsBal())}. За каждую раздачу Тропы — +${PTS_SHARE}.`;
// награда автору: % от покупки, который зритель оставляет автору; передаётся при выводе или когда Тропа завершится
// порядок (решено 23.10): сначала комиссия сервиса 6% (в ней и реферальный 1%), награда автору — % от остатка
const afterFee = demos => Math.round(demos*(1-FEE/100));
const tipOf = (demos, tip) => Math.round(afterFee(demos)*(tip||0)/100);
const lotTip = l => tipOf(lotAvail(l), l.tip);            // награда автору с того, что выводится сейчас
const lotTipFull = l => tipOf(lotDemos(l), l.tip);
const lotOut = l => afterFee(lotAvail(l)) - lotTip(l);
const readyLots = () => S.lots.filter(canOut);
const netOut = () => readyLots().reduce((a,l)=>a+lotOut(l),0);
const tipsTotal = () => readyLots().reduce((a,l)=>a+lotTip(l),0);
const readyBal = () => readyLots().reduce((a,l)=>a+lotAvail(l),0);
const TIP_OPTS = [1,5,20];
function tipChooser(base, sel, custom){
  return `<div class="amounts">${TIP_OPTS.map(v=>`<button class="amt tipb ${sel===v?'on':''}" data-a="tip-pick" data-v="${v}"><span>${v}%</span><small>${fmt(base*v/100)}</small></button>`).join('')}<button class="amt tipb ${sel==='custom'?'on':''}" data-a="tip-pick" data-v="custom"><span>Своя</span><small>${sel==='custom'&&+custom?fmt(base*custom/100):'%'}</small></button></div>
   ${sel==='custom'?`<div class="field" style="display:flex;gap:8px;align-items:center"><input id="tip-custom" type="text" inputmode="numeric" maxlength="3" placeholder="Свой процент, от 1 до 100" value="${esc(custom||'')}" data-input="tip-custom"><span class="c-sec">%</span></div>`:''}
   <div class="caption c-acc">5% — рекомендуемая награда</div>`;
}
const tipValue = p => p.tip==='custom' ? Math.min(100, Math.max(0, +p.tipCustom||0)) : (p.tip||0);
const dayWord = n => (n%10===1&&n%100!==11)?'день':(n%10>=2&&n%10<=4&&(n%100<12||n%100>14))?'дня':'дней';
function lotHTML(l){ const live = l.settled === false, k = lotK(l), av = lotAvail(l), lk = lotLocked(l), nx = vestNext(l.settledAt, l.test);
  const vf = live ? 0 : vestFrac(l.settledAt, l.test), pct = Math.round(vf*100);
  return `<div class="lot"><div class="top"><span class="strong">+${fmt(lotLeft(l))} DEMOS</span><span class="badge ${live?'acc':lk?'mut':'suc'}">${live?'Тропа идёт':lk?'стейкинг':'можно вывести'}</span></div>
    <div class="caption c-sec">куплено на ${fmt(l.demos)} DEMOS · ${live?'сейчас ':''}${coefStr(k)}${live?' · итог — когда Тропа завершится':' · Тропа завершилась'}</div>
    ${live?`<div data-lotbar="${l.trail}">${kaBarHTML(k, l.demos, lotDemos(l), true)}</div>`:''}
    <div class="caption c-mut">${esc(l.title)} · ${cur(l.ton)}${l.sig?` · <button class="c-acc" data-a="link" data-v="${SOL_EXPLORER(l.sig)}">транзакция ↗</button>`:''}</div>
    ${live?'':`<div class="top caption" style="margin-top:6px;display:flex;justify-content:space-between"><span class="c-sec">Стейкинг ${Math.round(vf*VEST_DAYS)} из ${VEST_DAYS}</span><span>можно вывести <b>${fmt(av)}</b>${lk?` · в стейкинге ${fmt(lk)}`:''}</span></div>
    <div class="prog" style="height:4px"><i style="width:${pct}%"></i></div>
    <div class="caption c-mut">${lk?`Следующая треть через ${hhmm(nx)}${l.test?' (в тесте сутки = 1 мин)':''} · комиссия ${FEE}%`:`Всё разблокировано · комиссия ${FEE}%`}</div>`}
    <div class="top caption" style="margin-top:4px;border-top:1px solid var(--b-default);padding-top:8px"><span class="c-sec">${l.tip?`Автору @${esc(l.author||'')}: ${l.tip}% · ${fmt(lotTipFull(l))} DEMOS`:'Награда автору не выбрана'}</span><button class="c-acc" style="font-weight:600" data-a="tip-edit" data-i="${S.lots.indexOf(l)}">Изменить</button></div></div>`; }
function walletHTML(){ if (PTS) return pointsHTML();
  const w = S.wallet, bal = balance();
  return `<div class="pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
    <div class="box"><div class="caption c-sec">На счёте</div><div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap"><span class="title">${fmt(availTotal())}</span><span class="c-sec">DEMOS</span>${lockedTotal()?`<span class="caption c-sec">+ ${fmt(lockedTotal())} в стейкинге</span>`:''}</div>
      ${liveTotal()?`<div class="caption c-mut">В идущих Тропах ≈ ${fmt(liveTotal())} DEMOS — итог при завершении</div>`:''}
      <div class="caption c-sec" style="margin-top:2px">${readyLots().length?`Вывести сейчас: ${fmt(netOut())} DEMOS после комиссии ${FEE}%${tipsTotal()?` и награды авторам (${fmt(tipsTotal())})`:''}`:'Пока нечего выводить: итог разблокируется после завершения Тропы — по трети в день'}</div>
      <button class="btn primary" style="margin-top:10px" data-a="go" data-to="withdraw" ${readyLots().length?'':'disabled'}>Вывести на кошелёк</button></div>
    ${S.lots.length?`<div class="strong" style="margin-top:6px">Покупки на счёте</div><div class="caption c-mut" style="margin-top:-6px">Когда Тропа завершается, итог покупки разблокируется за 3 дня — по трети в день. Комиссия при выводе — 6%.</div>${S.lots.map(lotHTML).join('')}`:''}
    <div class="box" style="display:flex;justify-content:space-between;align-items:center"><span class="caption">${WEB?(w.ton?`Phantom · ${w.ton}<br><span class="c-mut">тестовая сеть Solana (Devnet)</span>`:'Кошелёк Solana не подключён'):(w.ton?'TON-кошелёк '+w.ton:'TON-кошелёк не подключён')}</span><button class="caption c-acc" data-a="ton">${w.ton?'Отключить':'Подключить'}</button></div>
    <div class="strong" style="margin-top:6px">Мои X3D</div>
    ${S.myX3d.map(x=>`<div class="kv"><div><div class="strong">${esc(x.title)}</div><div class="caption c-mut">${curText(x.info)}</div></div><div style="text-align:right"><span class="badge ${x.st==='На счёте'?'acc':'mut'}">${x.st}</span><div class="caption c-sec">${x.rew}</div></div></div>`).join('')}
    <div class="strong" style="margin-top:6px">Вы как автор</div>
    <div class="kv"><div><div>Получено от зрителей</div><div class="caption c-mut">за 30 дней · обновляется сразу</div></div><span class="strong">3 260 DEMOS</span></div>
    <button class="kv" style="width:100%;text-align:left" data-a="go" data-to="thanks"><div><div>Благодарности</div><div class="caption c-mut">37 человек · с сообщениями</div></div><span class="c-acc">Открыть ›</span></button>
    <div class="box" style="margin-top:6px"><div class="strong">Пригласите друзей</div><div class="caption c-sec" style="margin:4px 0 8px">1% от каждого их буста X3D и благодарности — вам в ${CUR} через 14 дней после покупки друга. Действует 6 месяцев с момента, как друг пришёл по ссылке.</div>
      <button class="caption c-acc" style="text-align:left" data-a="go" data-to="referrals">Приглашено ${REFERRAL.friends.length} · получено ${cur(refSum())}  →</button>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">${refLinkShort()}</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`;
}

// Благодарности автору — в личном кабинете (решено 23.10): кто, сколько, за какую Тропу, сообщение. Ответа внутри DEMOS нет — можно написать человеку в Telegram или соцсетях.
const thanksWeb = () => `<div class="screen">${topbar('Благодарности')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
  <div class="box center" style="padding:18px"><div class="caption c-sec">Вас поблагодарили</div><div style="display:flex;justify-content:center;align-items:baseline;gap:6px;margin-top:4px"><span class="title" style="font-size:32px">37</span><span class="c-sec">человек</span></div><div class="caption c-sec">11 100 DEMOS за 30 дней</div></div>
  <div class="caption c-mut">Сообщения приходят в одну сторону. Чтобы ответить, нажмите на ник — там Telegram и соцсети человека. DEMOS от благодарностей разблокируются за 3 дня — по трети в день, вывод с комиссией 6%.</div>
  ${THANKS.map(th=>{ const tr = byId(th.trail); return `<div class="box" style="display:flex;flex-direction:column;gap:6px">
    <div class="top" style="display:flex;justify-content:space-between;align-items:center"><button class="strong c-acc" data-a="person" data-v="${esc(th.from)}">@${esc(th.from)}</button><span class="strong c-suc">+${fmt(th.demos)} DEMOS</span></div>
    <div class="caption c-mut">${th.at} · ${cur(th.ton)} · ${tr?esc(tr.frags[0].text.slice(0,40))+'…':''}</div>
    ${th.text?`<div class="body">${esc(th.text)}</div>`:'<div class="caption c-mut">Без сообщения</div>'}</div>`; }).join('')}
  <div class="caption c-mut center">Ещё 33 благодарности — в рабочей версии</div></div></div>`;
SCREENS.trail = () => { const t = byId(S.params.id); return `<div class="screen">${topbar(t.own?'Ваша Тропа':'Тропа')}<div class="feed">${cardHTML(t)}</div></div>`; };

// ---------- приглашённые ----------
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const tonFmt = n => String(Math.round(n*10)/10).replace('.',',');
const refEarned = nick => REFERRAL.ledger.filter(e=>e.friend===nick).reduce((a,e)=>a+e.amount,0);
function refSum(){ return REFERRAL.ledger.reduce((a,e)=>a+e.amount,0); }
function refTotal(){ return tonFmt(REFERRAL.ledger.reduce((a,e)=>a+e.amount,0)); }
function refLeft(f){ const d = new Date(f.joined+'T00:00:00'); const end = new Date(d); end.setMonth(end.getMonth()+REFERRAL.months);
  const ms = end - Date.now(); return ms<=0 ? 0 : Math.ceil(ms/(30.44*86400000)); }
SCREENS.referrals = () => { const fr = REFERRAL.friends;
  return `<div class="screen">${topbar('Приглашённые')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="box center" style="padding:20px"><div class="caption c-sec">Получено от приглашённых</div><div style="display:flex;justify-content:center;align-items:baseline;gap:6px;margin-top:4px"><span class="title" style="font-size:36px">${numRu(refSum()*CURK)}</span><span class="c-sec">${CUR} · ${fr.length} ${fr.length===1?'друг':fr.length<5?'друга':'друзей'}</span></div></div>
  <div class="caption c-sec">1% от каждого буста X3D и благодарности приглашённого — вам в ${CUR} через 14 дней после его покупки. По каждому другу действует 6 месяцев с момента, как он пришёл по вашей ссылке.</div>
  <div class="strong">Друзья</div>
  <div>${fr.map(f=>{ const d=new Date(f.joined+'T00:00:00'); const left=refLeft(f);
    return `<div class="kv"><div><div class="strong">@${esc(f.nick)}</div><div class="caption ${left?'c-mut':'c-warn'}">${f.she?'пришла':'пришёл'} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} · ${left?`осталось ${left} мес`:'срок истёк'}</div></div><span class="strong c-suc">+${cur(refEarned(f.nick))}</span></div>`; }).join('')}</div>
  <div class="caption c-mut">После 6 месяцев друг остаётся в DEMOS, но 1% от его бустов больше не начисляется.</div>
  <div style="display:flex;gap:8px;align-items:center"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">${refLinkShort()}</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`; };

SCREENS.withdraw = () => { const bal = readyBal(), out = netOut();
  return `<div class="screen">${topbar('Вывод DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px">
  <div class="box center" style="padding:20px"><div class="caption c-sec">На кошелёк</div><div class="title" style="font-size:36px">${fmt(out)}</div><div class="caption c-sec">DEMOS из ${fmt(bal)}, которые уже можно вывести</div></div>
  <div class="strong">По каждой покупке</div>
  ${S.lots.map(l=>{ const ok=canOut(l), lk=lotLocked(l); return `<div class="kv"><div><div>${fmt(lotAvail(l))} из ${fmt(lotLeft(l))} DEMOS <span class="c-mut">(${coefStr(lotK(l))})</span></div><div class="caption c-mut">${l.settled===false?'Тропа идёт — вывод после завершения':lk?`в стейкинге ${fmt(lk)} · следующая треть через ${hhmm(vestNext(l.settledAt, l.test))}`:`всё разблокировано · комиссия ${FEE}%`}</div>${ok?`<div class="caption c-mut">${l.tip?`автору <b class="nick">@${esc(l.author||'')}</b>: ${l.tip}% · ${fmt(lotTip(l))}`:`<b class="nick">@${esc(l.author||'')}</b> · без награды автору`} · <button class="c-acc" data-a="tip-edit" data-i="${S.lots.indexOf(l)}">изменить</button></div>`:''}</div><span class="v ${ok?'':'c-mut'}">${ok?fmt(lotOut(l)):'—'}</span></div>`; }).join('')}
  <div class="kv"><span class="k">Награда авторам</span><span class="v">${fmt(tipsTotal())} DEMOS</span></div>
  <div class="kv"><span class="k">Комиссия всего</span><span class="v">${fmt(bal-out-tipsTotal())} DEMOS</span></div>
  <div class="kv"><span class="k">Кошелёк</span><span class="v">${S.wallet.ton||'не подключён'}</span></div>
  <div class="caption c-mut">Выводится то, что уже разблокировано: после завершения Тропы — по трети в день за 3 дня. Комиссия — 6%, минимум — ${cur(1)}. Награда автору передаётся при выводе — её можно изменить прямо здесь. Комиссию сети ${WEB?'Solana':'TON'} платит DEMOS. В тестовой версии вывод условный.</div></div>
  <div class="pad" style="padding:12px 20px calc(20px + var(--safe-bottom))">${out<S.rate?`<div class="caption c-warn center" style="margin-bottom:8px">Минимум для вывода — ${cur(1)} (≈ ${fmt(S.rate)} DEMOS)</div>`:''}<button class="btn primary" data-a="withdraw-do" ${bal&&out>=S.rate?'':'disabled'}>${S.wallet.ton?`Вывести ${fmt(out)} DEMOS`:'Подключить кошелёк'}</button></div></div>`; };

// ---------- уведомления веб-версии (23.10): включение, тест на устройстве, код подписки для отправки с сервера ----------
const VAPID_PUBLIC = 'BAJUM_wtzAzvKN-nLENr3vddT4tbzpCWzig0dRjGc1Ou4zBgrA5OnKFYCO5tx4iNPI1idYIE9XH7O7GkBAyU8_E';
const PUSH = { perm: (typeof Notification!=='undefined') ? Notification.permission : 'unsupported', sub: '', reg: null };
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...b].map(c=>c.charCodeAt(0))); };
async function swReg(){ if (!WEB || !('serviceWorker' in navigator)) return null; if (PUSH.reg) return PUSH.reg; try{ PUSH.reg = await navigator.serviceWorker.register('sw.js'); return PUSH.reg; }catch(e){ return null; } }
if (WEB) swReg().then(async r => { try{ if (r && r.pushManager){ const sb = await r.pushManager.getSubscription(); if (sb){ PUSH.sub = JSON.stringify(sb); if (S.screen==='about') render(false); } } }catch(e){} });
function pushCard(){ if (!WEB) return '';
  const st = PUSH.perm==='unsupported' ? ['mut','не поддерживаются'] : PUSH.perm==='denied' ? ['warn','запрещены'] : (PUSH.perm==='granted' && PUSH.sub) ? ['suc','включены'] : ['mut','выключены'];
  return `<div class="box" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="strong">Уведомления</span><span class="badge ${st[0]}">${st[1]}</span></div>
   <div class="caption c-sec">«Вам раздали Тропу · 1,2 км от вас», дополнения Троп из подписок, благодарности. ${PUSH.perm==='unsupported'?'На iPhone уведомления работают, только если добавить DEMOS на экран «Домой» (Safari → «Поделиться» → «На экран Домой») и открыть оттуда.':PUSH.perm==='denied'?'Разрешите уведомления для этого сайта в настройках браузера.':''}</div>
   ${PUSH.perm==='granted' && PUSH.sub ? `<button class="btn secondary" data-a="push-test">Прислать тестовое уведомление</button>` : PUSH.perm!=='unsupported' && PUSH.perm!=='denied' ? `<button class="btn primary" data-a="push-on">Включить уведомления</button>` : ''}</div>`; }
SCREENS.about = () => `<div class="screen">${topbar('О DEMOS')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:18px;padding-bottom:24px">
  ${pushCard()}
  <div class="title" style="font-size:26px;line-height:1.3;margin:10px 0">Правда —<br>это мнение, выдержавшее<br>равную конкуренцию</div>
  ${[['Равный старт','Любую новую Тропу сразу получают 108 человек рядом и по тегам, дальше — по 12 за каждое «Раздать». Неважно, кто автор и сколько у него знакомых.'],['Никаких подписчиков','Нет поиска людей и Троп, нет подписок на людей. Тропа расходится, только если её раздают.'],['Цену назначают люди',PTS?'«Раздать» — голос бесплатно. X3D — голос, на который человек тратит очки, расширяя охват до 36.':'«Раздать» — голос бесплатно. X3D — голос, за который человек платит, расширяя охват до 36.'],['Одна новая Тропа в день','Создать новую можно раз в сутки — лента не заваливается. А дополнять свою Тропу можно сколько угодно: история развивается.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="body c-sec">${b[1]}</div></div>`).join('')}
  <div>${['Как работает X3D','Условия использования','Политика конфиденциальности'].map((x,i)=>`<button class="kv" style="width:100%" ${i===0?'data-a="go" data-to="reward"':''}><span>${x}</span><span class="c-mut">›</span></button>`).join('')}</div>
  <button class="btn secondary" data-a="reset">Пройти онбординг заново</button>
  <div class="caption c-mut center">DEMOS · ${tg?'Telegram':(ANDROID_APP?'Android':'веб')} · версия 0.46 · тестовые данные</div></div></div>`;

const rewardWeb = () => `<div class="screen">${topbar('Как работает X3D')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="body c-sec">X3D — это буст: Тропу увидят ещё 36 человек. Сумма превращается в DEMOS и идёт в общую сумму X3D Тропы. Это не обещание дохода.</div>
  ${[['1. Оплата',`${numRu(1*CURK)}, ${numRu(10*CURK)} или ${cur(100)}.`],['2. Обмен','Вся сумма сразу превращается в DEMOS по текущей цене. Цена в окне оплаты обновляется автоматически каждые 60 секунд; обмен — по цене, которая была на экране в момент оплаты.'],['3. Коэффициент ×0,7–×2,0',KA_TEXT.replace('Итог — когда Тропа завершится.','')],['4. Счёт','Каждая покупка хранится отдельно; пока Тропа жива, показывается текущая оценка — она растёт, когда после вас покупают X3D. Итог фиксируется, когда Тропа завершится.'],['5. Вывод','Когда Тропа завершится, расчёт — сразу со всеми; итог разблокируется за 3 дня, по трети в день (стейкинг). Так же у автора. Комиссия — 6%.'],['6. Охват','Одинаковый при любой сумме: +36 человек.'],['7. Приглашения',`Пригласивший получает 1% от каждого X3D и благодарности друга в ${CUR} — через 14 дней после покупки, 6 месяцев. Это часть комиссии платформы, у вас ничего не удерживается.`],['8. Защита от накрутки','Одна покупка X3D на человека в одной Тропе; сумма одной покупки ограничена (до 1 SOL); вывод только после завершения Тропы и стейкинга 3 дня — модерация успевает проверить подозрительные покупки.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="caption c-sec">${b[1]}</div></div>`).join('')}
  <div class="box"><div class="strong">Пример</div><div class="caption c-sec">Вы оплатили ${cur(10)} — по курсу ${rateLine(300)} это 3 000 DEMOS. Если после вас купили в 9 раз больше — получите около ×1,6–×2,0 (до 6 000 DEMOS); если почти никто — около ×0,7 (2 100 DEMOS). После завершения Тропы — стейкинг 3 дня, по трети в день; комиссия 6%. Курс условный.</div></div>
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
const RATE = 300; // стартовая тестовая цена: 1 TON = 300 DEMOS
// цена DEMOS (решено 23.10): обновляется каждые 60 секунд; в рабочей версии её отдаёт сервер (из пула DEMOS/TON), в тестовой — условно меняется на ±1%
const PRICE_EVERY = 60;
const priceLeft = () => Math.max(0, PRICE_EVERY - Math.floor((Date.now()-S.rateAt)/1000));
const mmss = n => `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
setInterval(() => {
  if (Date.now()-S.rateAt >= PRICE_EVERY*1000){ S.rate = Math.max(1, Math.round(S.rate*(1+(Math.random()*2-1)/100))); S.rateAt = Date.now();
    if (S.sheet && (S.sheet.name==='x3d'||S.sheet.name==='thank') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) renderSheet(); }
  const el = document.getElementById('rate-left'); if (el) el.textContent = mmss(priceLeft());
}, 1000);
const NFT_TIERS = [{ton:1, g:['#1d4ed8','#3DB4FF']}, {ton:10, g:['#6d28d9','#3D8BFF']}, {ton:100, g:['#b45309','#f5a524']}];
const nftCard = (tier, on) => `<button class="nft ${on?'on':''}" data-a="x3d-amt" data-v="${tier.ton}">
  ${NFT_IMG[tier.ton] ? `<span class="nft-img"><img src="${NFT_IMG[tier.ton]}" alt="X3D ${cur(tier.ton)}"></span>` : `<span class="nft-art" style="background:linear-gradient(145deg,${tier.g[0]},${tier.g[1]})">
  <svg viewBox="0 0 40 36" class="nft-tri"><path d="M20 3L37 33H3z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>
  <span class="nft-x">X3D</span></span>`}
  <span class="nft-ton">${cur(tier.ton)}</span><span class="nft-dm">${PTS ? '+36 человек' : `≈ ${fmt(tier.ton*S.rate)} DEMOS`}</span></button>`;
const x3dWeb = p => { const t = byId(p.id); const a = p.amount || 10;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div style="display:flex;justify-content:space-between;align-items:center"><div class="heading">Буст Тропы</div>${strengthHTML(t.strength,t.trend)}</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам</div>
   <div class="nft-row">${NFT_TIERS.map(tr=>nftCard(tr, tr.ton===a)).join('')}</div>
   <div><div class="kv"><div><div class="k">Цена DEMOS</div><div class="fine c-mut">обновится через <span id="rate-left">${mmss(priceLeft())}</span></div></div><span class="v">${rateLine(S.rate)}</span></div><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">Покупка</span><span class="v">≈ ${fmt(a*S.rate)} DEMOS</span></div><div class="kv"><div><div class="k">При завершении Тропы</div><div class="fine c-mut">×0,7–×2,0: чем больше купят после вас</div></div><span class="v">${fmt(Math.round(a*S.rate*KA_MIN))}–${fmt(Math.round(a*S.rate*KA_MAX))}</span></div><div class="kv"><div><div class="k">Если Тропа завершится сразу</div><div class="fine c-mut">с учётом тех, кто купил до вас (${cur(trailVol(t))})</div></div><span class="v">≈ ${fmt(Math.round(a*S.rate*kaCoef(trailVol(t)+a, trailVol(t), a)))}</span></div><div class="kv"><span class="k">Комиссия при выводе</span><span class="v">6%</span></div></div>
   <div class="tipbox"><div class="top"><span class="strong">Награда автору</span><span class="caption c-mut">необязательно</span></div>
   <div class="caption c-sec">Сколько DEMOS из этой покупки (после комиссии 6%) оставить @${esc(t.author)}. Передаются при выводе токенов на кошелёк либо по завершении Тропы.</div>
   ${tipChooser(afterFee(a*S.rate), p.tip, p.tipCustom)}</div>
   <div class="fine c-mut">Сумма превращается в DEMOS по рынку и идёт в общую сумму X3D Тропы. Когда Тропа завершится, общая сумма делится между покупателями по коэффициенту ×0,7–×2,0: ничего не добавляется и не удерживается сверх комиссии. После завершения Тропы итог разблокируется за 3 дня — по трети в день; комиссия при выводе 6%. Цена DEMOS не гарантируется.</div>
   <button class="caption c-acc" style="text-align:left" data-a="go" data-to="reward">Как работает X3D →</button>
</div>
   <div class="foot">${S.residentDone?'':`<button type="button" class="check ${S.residentOk?'on':''}" data-a="resident"><span class="bx"></span><span>Я согласен с тем, что цена не гарантируется, и подтверждаю, что не являюсь резидентом страны из списка ограничений</span></button>`}<button class="btn primary" id="x3d-pay" data-a="x3d-pay" data-id="${t.id}" ${(S.residentOk||S.residentDone)?'':'disabled'}>Оплатить ${cur(a)}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.tipEdit = p => { const l = S.lots[p.i]; if (!l) return '';
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px"><div class="heading">Награда автору</div>
   <div class="caption c-sec">${esc(l.title)} · +${fmt(l.demos)} DEMOS. Сколько DEMOS (после комиссии 6%) оставить @${esc(l.author||'')}? Передаётся при выводе или когда Тропа завершится. Изменить можно в любой момент до передачи.</div>
   ${tipChooser(afterFee(l.demos), p.tip, p.tipCustom)}
   <button class="amt ${p.tip===0?'on':''}" style="height:40px" data-a="tip-pick" data-v="0">Без награды</button></div>
   <div class="foot"><button class="btn primary" data-a="tip-save">Сохранить</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.priceChanged = p => { const d = (p.rate/p.old-1)*100, sign = d>0?'+':'−', pct = String(Math.abs(d).toFixed(1)).replace('.',',');
  const was = Math.round(p.amount*p.old), now = Math.round(p.amount*p.rate);
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
   <div class="icon-circle" style="background:var(--bg-warning-soft);color:var(--t-warning)">!</div>
   <div class="heading center">Цена DEMOS изменилась</div>
   <div class="caption c-sec center">Пока вы выбирали, цена изменилась больше чем на 1%. Проверьте и подтвердите покупку ещё раз.</div>
   <div><div class="kv"><span class="k">Было на экране</span><span class="v c-sec" style="font-weight:400">${rateLine(p.old)}</span></div>
   <div class="kv"><span class="k">Сейчас</span><span class="v">${rateLine(p.rate)} <span class="${d>0?'c-suc':'c-warn'}">${sign}${pct}%</span></span></div>
   <div class="kv"><div><div class="k">${p.kind==='thank'?'Автору на счёт':'На ваш счёт'}</div><div class="fine c-mut">было ${fmt(was)} DEMOS</div></div><span class="v">≈ ${fmt(now)} DEMOS</span></div>
   ${p.kind!=='thank'&&p.tip?`<div class="kv"><span class="k">Награда автору ${p.tip}%</span><span class="v">${fmt(tipOf(now, p.tip))} DEMOS</span></div>`:''}
   <div class="kv"><span class="k">Сумма</span><span class="v">${cur(p.amount)}</span></div></div>
   <div class="fine c-mut">Обмен пройдёт по новой цене. Если не подтвердить, ничего не спишется.</div></div>
   <div class="foot"><button class="btn primary" data-a="price-confirm">Подтвердить и оплатить ${cur(p.amount)}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };

// ---------- Solana, тестовая сеть Devnet (решено 24.10; полная версия: веб, затем Android и iOS) ----------
// Оплата X3D и благодарностей — настоящий перевод SOL в тестовой сети через Phantom. Деньги ненастоящие.
// Безопасность: транзакция строится на Devnet и отправляется только в Devnet (кошелёк лишь подписывает) — в основную сеть она не уйдёт.
const SOL_RPC = 'https://api.devnet.solana.com';
const SOL_TREASURY = '8pwxFAcuGLd6bxzFRazo5hVkqmSX4XBZG6xZkQy9nXoX'; // тестовый адрес платформы (только Devnet)
const SOL_EXPLORER = sig => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const SOLW = { pk: WEB ? store.get('solPk', null) : null };
const shortPk = pk => pk ? pk.slice(0,4) + '…' + pk.slice(-4) : '';
if (WEB && SOLW.pk) S.wallet.ton = shortPk(SOLW.pk);
if (WEB) S.lots = S.lots.concat(store.get('solLots', [])); // настоящие (тестовые) покупки сохраняются на устройстве
const phantom = () => { try{ const p = (window.phantom && window.phantom.solana) || window.solana; return p && p.isPhantom ? p : null; }catch(e){ return null; } };
let web3p = null;
function loadWeb3(){ if (window.solanaWeb3) return Promise.resolve(window.solanaWeb3); if (web3p) return web3p;
  web3p = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js';
    sc.onload = () => window.solanaWeb3 ? res(window.solanaWeb3) : rej(new Error('web3')); sc.onerror = () => { web3p = null; rej(new Error('web3')); }; document.head.appendChild(sc); });
  return web3p; }
const phantomLink = () => 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin);
async function solConnect(){ const p = phantom(); if (!p){ const m = walletMode(); if (m === 'mwa') return mwaConnect(); if (m === 'dl'){ store.set('phPending', null); loadNacl().catch(()=>{}); openSheet('dlConnect'); return null; } openSheet('phantom'); return null; }
  try{ const r = await p.connect(); SOLW.pk = r.publicKey.toString(); store.set('solPk', SOLW.pk); S.wallet.ton = shortPk(SOLW.pk); return SOLW.pk; }
  catch(e){ toast('Подключение отменено'); return null; } }
function solDisconnect(){ try{ const p = phantom(); p && p.disconnect && p.disconnect(); }catch(e){} try{ NATIVE() && NATIVE().mwaDisconnect && NATIVE().mwaDisconnect(); }catch(e){} SOLW.pk = null; store.set('solPk', null); DL.set(null); S.wallet.ton = null; }
// перевод SOL (Devnet) на адрес платформы: транзакцию собираем здесь, кошелёк только подписывает, отправляем сами — только в Devnet
async function buildTx(amountSol){ const w3 = await loadWeb3(); const conn = new w3.Connection(SOL_RPC, 'confirmed'); const from = new w3.PublicKey(SOLW.pk);
  const lamports = Math.round(amountSol * 1e9);
  const bal = await conn.getBalance(from); if (bal < lamports + 10000) { const e = new Error('funds'); e.bal = bal/1e9; throw e; }
  const bh = await conn.getLatestBlockhash('confirmed');
  const tx = new w3.Transaction({feePayer: from, recentBlockhash: bh.blockhash}).add(w3.SystemProgram.transfer({fromPubkey: from, toPubkey: new w3.PublicKey(SOL_TREASURY), lamports}));
  return {w3, conn, tx, bh}; }
async function sendSigned(conn, raw, bh){ if (S.sheet && S.sheet.name==='paying'){ S.sheet.params.step = 'confirm'; renderSheet(); }
  const sig = await conn.sendRawTransaction(raw);
  await conn.confirmTransaction({signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight}, 'confirmed'); return sig; }
async function solPay(amountSol, mode){ if (!SOLW.pk) throw new Error('nowallet');
  const {conn, tx, bh} = await buildTx(amountSol);
  if (mode === 'mwa'){ const unsigned = tx.serialize({requireAllSignatures:false, verifySignatures:false}); const signed = await nativeCall('mwaSign', b64enc(unsigned)); return sendSigned(conn, b64dec(signed), bh); }
  const p = phantom(); if (!p) throw new Error('nowallet'); const signed = await p.signTransaction(tx); return sendSigned(conn, signed.serialize(), bh); }

// ---- base58 / base64 ----
const B58A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58enc(b){ b = b instanceof Uint8Array ? b : new Uint8Array(b); let z = 0; while (z < b.length && b[z] === 0) z++; const d = [];
  for (let i = z; i < b.length; i++){ let c = b[i]; for (let j = 0; j < d.length; j++){ c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c){ d.push(c % 58); c = (c / 58) | 0; } }
  return '1'.repeat(z) + d.reverse().map(x => B58A[x]).join(''); }
function b58dec(str){ let z = 0; while (z < str.length && str[z] === '1') z++; const b = [];
  for (let i = z; i < str.length; i++){ let c = B58A.indexOf(str[i]); if (c < 0) throw new Error('b58'); for (let j = 0; j < b.length; j++){ c += b[j] * 58; b[j] = c & 255; c >>= 8; } while (c){ b.push(c & 255); c >>= 8; } }
  return new Uint8Array([...new Array(z).fill(0), ...b.reverse()]); }
const b64enc = u8 => btoa(String.fromCharCode(...u8)), b64dec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// ---- переход в Phantom и обратно (телефон, обычный браузер; решено основателем 24.10) ----
// Протокол Phantom deeplinks: connect → signTransaction; ответ шифруется (x25519 + NaCl box), ключи сессии хранятся на устройстве.
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const PH_BASE = 'https://phantom.app/ul/v1/';
let naclp = null;
function loadNacl(){ if (window.nacl) return Promise.resolve(window.nacl); if (naclp) return naclp;
  naclp = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl-fast.min.js';
    sc.onload = () => window.nacl ? res(window.nacl) : rej(new Error('web3')); sc.onerror = () => { naclp = null; rej(new Error('web3')); }; document.head.appendChild(sc); });
  return naclp; }
const DL = { get: () => store.get('phDL', null), set: v => store.set('phDL', v) };
function dlRedirect(action){ const ref = inviteCode();
  if (ANDROID_APP) return 'demos://phantom?ph=' + action; // в Android-приложение — по своей схеме
  const u = new URL(location.origin + location.pathname); if (ref) u.searchParams.set('ref', ref); u.searchParams.set('ph', action); return u.toString(); }
function dlConnectUrl(){ const nacl = window.nacl; const kp = nacl.box.keyPair(); DL.set({sk: b58enc(kp.secretKey), pk: b58enc(kp.publicKey)});
  return PH_BASE + 'connect?' + new URLSearchParams({app_url: location.origin, dapp_encryption_public_key: b58enc(kp.publicKey), redirect_link: dlRedirect('connect'), cluster: 'devnet'}); }
async function dlPrepare(job){ const nacl = await loadNacl(); const d = DL.get(); if (!d || !d.session) throw new Error('nosession');
  const {tx, bh} = await buildTx(job.amountSol); const ser = tx.serialize({requireAllSignatures:false, verifySignatures:false});
  const shared = nacl.box.before(b58dec(d.phPk), b58dec(d.sk)); const nonce = nacl.randomBytes(24);
  const enc = nacl.box.after(new TextEncoder().encode(JSON.stringify({transaction: b58enc(ser), session: d.session})), nonce, shared);
  store.set('phPending', {...job, bh: bh.blockhash, lvh: bh.lastValidBlockHeight});
  return PH_BASE + 'signTransaction?' + new URLSearchParams({dapp_encryption_public_key: d.pk, nonce: b58enc(nonce), redirect_link: dlRedirect('sign'), payload: b58enc(enc)}); }
async function dlReturn(){ const q = new URLSearchParams(location.search); const ph = q.get('ph'); if (!ph) return;
  const clean = () => { const u = new URL(location.href); ['ph','phantom_encryption_public_key','nonce','data','errorCode','errorMessage'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search); };
  const job = store.get('phPending', null);
  if (q.get('errorCode')){ clean(); store.set('phPending', null); return openSheet('payFail', {text: q.get('errorCode')==='4001' ? 'Отменено в Phantom. Деньги не списаны.' : 'Phantom вернул ошибку: ' + (q.get('errorMessage') || q.get('errorCode')) + '. Деньги не списаны.'}); }
  try{ const nacl = await loadNacl(); const d = DL.get(); if (!d) throw new Error('nosession');
    if (ph === 'connect') d.phPk = q.get('phantom_encryption_public_key');
    const shared = nacl.box.before(b58dec(d.phPk), b58dec(d.sk));
    const plain = nacl.box.open.after(b58dec(q.get('data')), b58dec(q.get('nonce')), shared); if (!plain) throw new Error('decrypt');
    const data = JSON.parse(new TextDecoder().decode(plain)); clean();
    if (ph === 'connect'){ d.session = data.session; d.wallet = data.public_key; DL.set(d); SOLW.pk = data.public_key; store.set('solPk', SOLW.pk); S.wallet.ton = shortPk(SOLW.pk); render(false);
      toast('Phantom подключён · ' + shortPk(SOLW.pk)); if (job) openDlPay(job); return; }
    if (ph === 'sign' && job){ openSheet('paying', {amount: job.kind==='x3d' ? job.a : job.ton, step:'confirm'});
      const w3 = await loadWeb3(); const conn = new w3.Connection(SOL_RPC, 'confirmed');
      const sig = await sendSigned(conn, b58dec(data.transaction), {blockhash: job.bh, lastValidBlockHeight: job.lvh}); store.set('phPending', null); finishJob(job, sig); }
  }catch(e){ clean(); openSheet('payFail', {text: solErrText(e)}); } }
function openDlPay(job){ S.dlUrl = null; openSheet('dlPay', {job}); dlPrepare(job).then(u => { S.dlUrl = u; if (S.sheet && S.sheet.name==='dlPay') renderSheet(); }).catch(e => openSheet('payFail', {text: solErrText(e)})); }
SHEETS.dlConnect = () => `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Подключите Phantom</div>
   <div class="caption c-sec">Откроется приложение Phantom — подтвердите подключение, и вас вернёт в DEMOS. Сейчас тестовая сеть Solana (Devnet): деньги ненастоящие. В Phantom: Настройки → Настройки разработчика → Режим тестовой сети → Devnet.</div></div>
   <div class="foot"><button class="btn primary" data-a="dl-connect">Подключить Phantom</button><button class="btn ghost" data-a="link" data-v="https://phantom.app/download">Установить Phantom</button></div>`;
SHEETS.dlPay = p => `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">P</div>
   <div class="heading">Оплата в Phantom</div><div class="caption c-sec">${S.dlUrl ? `Откроется Phantom — подтвердите оплату ${cur(p.job.kind==='x3d'?p.job.a:p.job.ton)}, и вас вернёт в DEMOS.` : 'Готовим платёж…'} Тестовая сеть Solana (Devnet) — деньги ненастоящие.</div></div>
   <div class="foot"><button class="btn primary" data-a="dl-go" ${S.dlUrl?'':'disabled'}>Оплатить в Phantom</button><button class="btn ghost" data-a="close">Отмена</button></div>`;

// ---- Android-приложение: Solana Mobile Wallet Adapter через мост с приложением ----
const NATIVE = () => (ANDROID_APP && window.DEMOSNative) ? window.DEMOSNative : null;
const nativeCbs = {}; let nativeSeq = 0;
window.__nativeCb = (id, ok, value) => { const cb = nativeCbs[id]; if (!cb) return; delete nativeCbs[id]; ok ? cb.res(value) : cb.rej(new Error(value || 'native')); };
function nativeCall(method, arg){ return new Promise((res, rej) => { const n = NATIVE(); if (!n || !n[method]) return rej(new Error('nowallet')); const id = 'c' + (++nativeSeq); nativeCbs[id] = {res, rej}; try{ arg === undefined ? n[method](id) : n[method](id, arg); }catch(e){ delete nativeCbs[id]; rej(e); } }); }
async function mwaConnect(){ try{ const pk = await nativeCall('mwaConnect'); SOLW.pk = pk; store.set('solPk', pk); S.wallet.ton = shortPk(pk); return pk; }
  catch(e){ toast(/nowallet|NoWallet/i.test(e.message) ? 'Не найден кошелёк Solana на телефоне' : 'Подключение отменено'); return null; } }
// какой способ: расширение/браузер Phantom → MWA в Android-приложении → переход в Phantom на телефоне → нет кошелька (компьютер без расширения)
const walletMode = () => phantom() ? 'inject' : NATIVE() ? 'mwa' : IS_MOBILE ? 'dl' : 'none';
async function walletPay(job){ const mode = walletMode();
  if (mode === 'none') return openSheet('phantom');
  if (mode === 'dl'){ store.set('phPending', job); const d = DL.get(); if (!d || !d.session){ loadNacl().catch(()=>{}); return openSheet('dlConnect'); } return openDlPay(job); }
  if (!SOLW.pk){ const pk = mode === 'mwa' ? await mwaConnect() : await solConnect(); if (!pk) return; }
  openSheet('paying', {amount: job.kind==='x3d' ? job.a : job.ton});
  try{ const sig = await solPay(job.amountSol, mode); finishJob(job, sig); }catch(e){ openSheet('payFail', {text: solErrText(e)}); } }
function finishJob(job, sig){ if (job.kind === 'x3d') finishPay(job.id, job.a, job.tip, job.rate, sig); else finishThank(job.id, job.ton, job.text, job.rate, sig); }
const solErrText = e => { const m = String(e && (e.message || e)); return m==='funds' ? `На кошельке недостаточно тестовых SOL (сейчас ${numRu(e.bal||0)} SOL). Пополните кошелёк в тестовой сети Devnet.`
  : /reject|cancel|denied|4001/i.test(m) ? 'Оплата отменена в кошельке. Деньги не списаны.' : m==='web3' ? 'Не удалось загрузить модуль Solana. Проверьте интернет и попробуйте ещё раз.'
  : m==='nosession' ? 'Подключение к Phantom устарело. Подключите кошелёк ещё раз. Деньги не списаны.' : m==='nowallet' ? 'Кошелёк не подключён.'
  : 'Платёж не прошёл. Проверьте, что в кошельке включена тестовая сеть (Devnet), и попробуйте ещё раз. Деньги не списаны.'; };
SHEETS.phantom = () => `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Подключите кошелёк Phantom</div>
   <div class="caption c-sec">Оплата X3D и благодарностей — через кошелёк Solana. Сейчас тестовая сеть (Devnet): деньги ненастоящие. В Phantom включите: Настройки → Настройки разработчика → Режим тестовой сети → Devnet.</div>
   <div class="caption c-mut">На телефоне откройте DEMOS внутри Phantom — кнопка ниже. На компьютере установите расширение Phantom и обновите страницу.</div></div>
   <div class="foot"><button class="btn primary" data-a="link" data-v="${phantomLink()}">Открыть DEMOS в Phantom</button><button class="btn ghost" data-a="link" data-v="https://phantom.app/download">Установить Phantom</button></div>`;
SHEETS.payFail = p => `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-warning-soft);color:var(--t-warning)">!</div><div class="heading">Оплата не прошла</div><div class="caption c-sec">${esc(p.text)}</div></div>
   <div class="foot"><button class="btn primary" data-a="close">Понятно</button></div>`;
SHEETS.paying = p => `<div class="grab"></div><div class="sc center" style="padding-top:10px"><div class="icon-circle" style="background:var(--bg-accent-soft);color:var(--t-accent)">⌛</div><div class="heading">${p.step==='confirm'?'Ждём подтверждения сети':'Подтвердите в кошельке'}</div><div class="caption c-sec" style="margin:6px 0 16px">${p.step==='confirm'?'Платёж отправлен, сеть Solana подтверждает его — обычно несколько секунд.':`Подтвердите оплату ${cur(p.amount)} в кошельке.`} Тестовая сеть Solana (Devnet) — деньги ненастоящие.</div></div>`;
const boostedWeb = p => { const t = byId(p.id), x = t.my.x3d;
  return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">✓</div><div class="heading">Вы поддержали Тропу</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам. Вы подписаны на Тропу — пришлём её дополнения.</div>
   <div style="text-align:left"><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">Покупка</span><span class="v">${fmt(x.demos)} DEMOS</span></div><div class="kv"><span class="k">Ваш номер</span><span class="v">№${x.lot?x.lot.n:t.x3d}</span></div><div class="kv"><span class="k">Награда автору</span><span class="v">${x.tip?`${x.tip}% от итога`:'не выбрана'}</span></div></div>
   ${x.lot?`<div class="box" style="text-align:left" data-lotbar="${t.id}" data-full="1">${kaBarHTML(lotK(x.lot), x.demos, lotDemos(x.lot))}</div>`:''}
   ${p.sig?`<button class="caption c-acc" data-a="link" data-v="${SOL_EXPLORER(p.sig)}">Транзакция в Solana Explorer (Devnet) ↗</button>`:''}
   <div class="caption c-mut">Итог — когда Тропа завершится: общая сумма X3D Тропы делится по коэффициенту ×0,7–×2,0, расчёт сразу со всеми; затем стейкинг 3 дня — по трети в день. Награду автору можно изменить в кошельке до вывода. Сейчас тестовая сеть Solana (Devnet): деньги ненастоящие, цена и DEMOS условные.</div></div>
   <div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
SHEETS.mt = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Money Trust</div><div class="body c-sec">${PTS?'Показывает, насколько люди готовы тратить очки на охват этой Тропы.':'Показывает, насколько люди готовы платить за охват этой Тропы.'}</div>
   <div class="box"><div class="title">${mtText(t)}</div><div class="caption c-sec">${PTS?'Сколько всего очков потратили на X3D этой Тропы.':'Сколько всего заплатили за X3D этой Тропы.'}</div></div>
   <div class="box"><div class="strong" style="display:flex;align-items:center;gap:6px">${mtTri(t.mtOf,14)}${t.mtOf} из 100 выбирают X3D</div>
   <div style="display:flex;flex-direction:column;gap:6px;margin:12px 0"><span class="micro c-mut">ЦВЕТ ТРЕУГОЛЬНИКА</span>${[[0,'меньше 3 из 100'],[3,'от 3 до 7'],[8,'от 8 до 14'],[15,'от 15 до 24'],[25,'25 и больше']].map(l=>`<span class="caption c-sec" style="display:flex;align-items:center;gap:8px">${mtTri(l[0])}${l[1]}</span>`).join('')}</div>
   <div class="caption c-sec">Считаем, сколько из 100 человек, раздавших Тропу бесплатно, перешли на ${PTS?'раздачу X3D':'платную раздачу X3D'}. Здесь — ${t.mtOf}.</div>
   <div class="caption c-mut" style="margin-top:6px">X3D включает в себя бесплатную раздачу, поэтому каждый, кто купил X3D, уже входит в эти 100. Один человек считается один раз.</div></div></div>
   <div class="foot"><button class="btn secondary" data-a="close">Понятно</button></div>`; };
SHEETS.comments = p => { const t = byId(p.id);
  const one = (c, reply) => `<div class="comment ${reply?'reply':''}"><div class="caption"><b>@${c.who}</b> <span class="c-mut">${c.ago}</span></div><div class="body">${esc(c.text)}</div>
    <div class="caption" style="display:flex;gap:14px">${reply?'':`<button class="c-sec" data-a="reply" data-v="${c.id}" data-who="${c.who}">Ответить</button>`}${c.who==='marsaon'?`<button class="c-dan" data-a="del-comment" data-v="${c.id}">Удалить</button>`:''}</div></div>`;
  return `<div class="grab"></div><div class="sc"><div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px"><div class="heading">Комментарии ${t.comments}</div><span class="caption c-mut">Сначала новые</span></div>
   ${S.comments.map(c=>one(c)+c.replies.map(r=>one(r,true)).join('')).join('')}<div class="caption c-mut" style="padding:8px 0">Удалить можно только свой комментарий.</div></div>
   <div class="foot">${S.replyTo?`<div class="caption c-sec" style="display:flex;justify-content:space-between">Ответ @${S.replyTo.who}<button data-a="reply-cancel">✕</button></div>`:''}
   <div style="display:flex;gap:8px"><div class="field" style="flex:1;padding:10px 12px"><input id="cmt" maxlength="500" placeholder="${S.replyTo?'Написать ответ…':'Написать комментарий'}"></div><button class="btn primary" style="width:48px" data-a="send-comment" data-id="${t.id}">↑</button></div></div>`; };
SHEETS.author = p => { const t = byId(p.id), a = AUTHORS[t.author] || {city:'Москва',about:'',socials:[]};
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
   <div><div class="heading">@${t.author}</div><div class="caption c-sec">${a.city}</div></div><div class="body">${esc(a.about)}</div>
   ${a.socials.length?`<div class="caption c-mut" style="margin-top:4px">Соцсети автора</div>${a.socials.map(s=>`<button class="kv" style="width:100%;text-align:left" data-a="link" data-v="${s[2]}"><span><span class="strong">${s[0]} · ${s[1]}</span></span><span class="c-acc">›</span></button>`).join('')}`:''}</div>
   <div class="foot">${t.my.thanked?'<div class="caption c-mut center">Вы уже поблагодарили автора за эту Тропу</div>':`<button class="btn primary" data-a="sheet" data-s="thank" data-id="${t.id}">Поблагодарить автора</button>`}</div>`; };
const THANK_OPTS = [1,10,100];
const tonStr = n => String(Math.round(n*100)/100).replace('.',',');
const thankTon = p => p.v==='custom' ? ((parseFloat(String(p.custom||'').replace(',','.'))||0) / CURK) : (p.v||0);
const resBox = () => S.residentDone?'':`<button type="button" class="check ${S.residentOk?'on':''}" data-a="resident"><span class="bx"></span><span>Я согласен с тем, что цена не гарантируется, и подтверждаю, что не являюсь резидентом страны из списка ограничений</span></button>`;
// благодарность автору (решено 23.10): отдельная покупка DEMOS от 1 TON + сообщение до 500 знаков; автор видит ник и сообщение, ответа внутри DEMOS нет
const thankWeb = p => { const t = byId(p.id), v = thankTon(p), ok = v>=1;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Поблагодарить @${esc(t.author)}</div>
   <div class="caption c-sec">Отдельная покупка: ${CUR} превращаются в DEMOS по текущей цене и уходят автору. Минимум ${cur(1)}.</div>
   <div class="kv"><div><div class="k">Цена DEMOS</div><div class="fine c-mut">обновится через <span id="rate-left">${mmss(priceLeft())}</span></div></div><span class="v">${rateLine(S.rate)}</span></div>
   <div class="amounts">${THANK_OPTS.map(x=>`<button class="amt tipb ${p.v===x?'on':''}" data-a="thank-v" data-v="${x}"><span>${cur(x)}</span><small>${fmt(x*S.rate)}</small></button>`).join('')}<button class="amt tipb ${p.v==='custom'?'on':''}" data-a="thank-v" data-v="custom"><span>Своя</span><small id="thank-small">${p.v==='custom'&&ok?fmt(Math.round(v*S.rate)):'от '+cur(1)}</small></button></div>
   ${p.v==='custom'?`<div class="field" style="display:flex;gap:8px;align-items:center"><input id="thank-custom" type="text" inputmode="decimal" maxlength="7" placeholder="Сумма, от ${cur(1)}" value="${esc(p.custom||'')}" data-input="thank-custom"><span class="c-sec">${CUR}</span></div>`:''}
   <div><div style="display:flex;justify-content:space-between"><span class="caption c-sec">Сообщение автору · необязательно</span><span class="caption c-mut" id="thank-cnt">${(p.text||'').length}/500</span></div>
   <div class="field"><textarea maxlength="500" rows="3" data-input="thank-text" placeholder="Напишите, за что благодарите">${esc(p.text||'')}</textarea></div></div>
   <div class="kv"><span class="k">Автору на счёт</span><span class="v" id="thank-out">${ok?'≈ '+fmt(Math.round(v*S.rate))+' DEMOS':'—'}</span></div>
   <div class="fine c-mut">Автор увидит ваш ник и сообщение и сможет написать вам в Telegram или соцсетях из вашего профиля. Ответа внутри DEMOS нет. У автора DEMOS разблокируются за 3 дня — по трети в день, комиссия 6% — при выводе. В Money Trust благодарность не входит. Цена DEMOS не гарантируется.</div></div>
   <div class="foot">${resBox()}<button class="btn primary" id="thank-pay" data-a="thank-pay" data-id="${t.id}" ${ok&&(S.residentOk||S.residentDone)?'':'disabled'}>${ok?`Оплатить ${cur(v)}`:'Выберите сумму'}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };

// ---------- Telegram-версия на очках (24.10): окна X3D и благодарности, счёт очков ----------
const ptsFine = 'Очки — только внутри Telegram-версии DEMOS: их нельзя купить, вывести или обменять на деньги. Дают при входе, за раздачи и за буст.';
const x3dPts = p => { const t = byId(p.id); const a = p.amount || 10, cost = Math.round(a*CURK), ok = ptsBal() >= cost;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div style="display:flex;justify-content:space-between;align-items:center"><div class="heading">Буст Тропы</div>${strengthHTML(t.strength,t.trend)}</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам</div>
   <div class="nft-row">${NFT_TIERS.map(tr=>nftCard(tr, tr.ton===a)).join('')}</div>
   <div><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">Спишется</span><span class="v">${ptsN(cost)}</span></div><div class="kv"><div><div class="k">X3D в этой Тропе</div><div class="fine c-mut">вы будете №${t.x3d+1}</div></div><span class="v">${ptsN(trailVol(t))}</span></div><div class="kv"><div><div class="k">Вернётся очков</div><div class="fine c-mut">×0,7–×2,0: чем больше купят после вас</div></div><span class="v">${fmt(Math.round(COEF_MIN*cost))}–${fmt(Math.round(COEF_MAX*cost))}</span></div><div class="kv"><div><div class="k">Если Тропа завершится сразу</div><div class="fine c-mut">с учётом тех, кто купил до вас</div></div><span class="v">${ptsN(Math.round(kaPay(trailVol(t)+cost, trailVol(t), cost)))}</span></div><div class="kv"><span class="k">У вас</span><span class="v ${ok?'':'c-warn'}">${ptsN(ptsBal())}</span></div></div>
   <div class="tipbox"><div class="top"><span class="strong">Награда автору</span><span class="caption c-mut">необязательно</span></div>
   <div class="caption c-sec">Какой % очков за этот буст отдать @${esc(t.author)}. Передаётся, когда Тропа завершится; изменить можно до этого — в профиле → «Очки».</div>
   ${tipChooser(cost, p.tip, p.tipCustom)}</div>
   <div class="fine c-mut">${ptsFine}</div>
   <button class="caption c-acc" style="text-align:left" data-a="go" data-to="reward">Как работает X3D →</button>
</div>
   <div class="foot">${ok?'':`<div class="caption c-warn center">${ptsLack(cost)}</div>`}<button class="btn primary" id="x3d-pay" data-a="x3d-pay" data-id="${t.id}" ${ok?'':'disabled'}>Потратить ${ptsN(cost)}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
const boostedPts = p => { const t = byId(p.id), x = t.my.x3d;
  return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">✓</div><div class="heading">Вы поддержали Тропу</div>
   <div class="caption c-sec">Тропу увидят ещё 36 человек рядом с вами и по тегам. Вы подписаны на Тропу — пришлём её дополнения.</div>
   <div style="text-align:left"><div class="kv"><span class="k">Охват</span><span class="v">+36 человек</span></div><div class="kv"><span class="k">Потрачено</span><span class="v">${ptsN(x.pts)}</span></div><div class="kv"><span class="k">Ваш номер</span><span class="v">№${x.n}</span></div><div class="kv"><span class="k">Награда автору</span><span class="v">${x.tip?`${x.tip}%`:'не выбрана'}</span></div><div class="kv"><span class="k">Осталось у вас</span><span class="v">${ptsN(ptsBal())}</span></div></div>
   <div class="box" style="text-align:left" data-boost="${t.id}" data-compact="0">${coefBar(t, x)}</div>
   <div class="caption c-mut">Коэффициент растёт, когда после вас покупают X3D этой Тропы: от ×0,7 до ×2,0. Всё выплачивается из общей суммы X3D Тропы — сколько получают первые сверх своего, столько недополучают последние. Итог — когда Тропа завершится: расчёт сразу со всеми, затем стейкинг 3 дня — по трети в день. Следить можно на Тропе и в профиле → «Очки».</div></div>
   <div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
const thankPts = p => { const t = byId(p.id), v = thankTon(p), pts = Math.round(v*CURK), ok = v>=1, enough = ptsBal() >= pts;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px">
   <div class="heading">Поблагодарить @${esc(t.author)}</div>
   <div class="caption c-sec">Очки уходят автору сразу. Минимум ${ptsN(10)}. У вас ${ptsN(ptsBal())}.</div>
   <div class="amounts">${THANK_OPTS.map(x=>`<button class="amt tipb ${p.v===x?'on':''}" data-a="thank-v" data-v="${x}"><span>${fmt(x*CURK)}</span><small>очков</small></button>`).join('')}<button class="amt tipb ${p.v==='custom'?'on':''}" data-a="thank-v" data-v="custom"><span>Своя</span><small id="thank-small">${p.v==='custom'&&ok?fmt(pts):'от 10'}</small></button></div>
   ${p.v==='custom'?`<div class="field" style="display:flex;gap:8px;align-items:center"><input id="thank-custom" type="text" inputmode="numeric" maxlength="7" placeholder="Сколько очков, от 10" value="${esc(p.custom||'')}" data-input="thank-custom"><span class="c-sec">очков</span></div>`:''}
   <div><div style="display:flex;justify-content:space-between"><span class="caption c-sec">Сообщение автору · необязательно</span><span class="caption c-mut" id="thank-cnt">${(p.text||'').length}/500</span></div>
   <div class="field"><textarea maxlength="500" rows="3" data-input="thank-text" placeholder="Напишите, за что благодарите">${esc(p.text||'')}</textarea></div></div>
   <div class="kv"><span class="k">Автору</span><span class="v" id="thank-out">${ok?ptsN(pts):'—'}</span></div>
   <div class="fine c-mut">Автор увидит ваш ник и сообщение и сможет написать вам в Telegram или соцсетях из вашего профиля. Ответа внутри DEMOS нет. В Money Trust благодарность не входит. ${ptsFine}</div></div>
   <div class="foot"><div class="caption c-warn center ${ok&&!enough?'':'hidden'}" id="thank-lack">${ptsLack(pts)}</div><button class="btn primary" id="thank-pay" data-a="thank-pay" data-id="${t.id}" ${ok&&enough?'':'disabled'}>${ok?`Отправить ${ptsN(pts)}`:'Выберите сумму'}</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
const thankedPts = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">♥</div><div class="heading">Спасибо, что поблагодарили</div><div class="caption c-sec">@${t.author} получил ${ptsN(p.v)} за эту Тропу.</div>${p.text?`<div class="box caption" style="text-align:left"><span class="c-mut">Ваше сообщение</span><br>${esc(p.text)}</div>`:''}
   <div class="box" style="text-align:left"><div class="kv"><span class="k">Поблагодарили за эту Тропу</span><span class="v">38 человек</span></div><div class="kv"><span class="k">Осталось у вас</span><span class="v">${ptsN(ptsBal())}</span></div></div>
   <div class="caption c-mut">Поблагодарить за одну Тропу можно один раз — кнопки больше не появятся.</div></div><div class="foot"><button class="btn primary" data-a="close">Готово</button></div>`; };
const thanksPts = () => `<div class="screen">${topbar('Благодарности')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
  <div class="box center" style="padding:18px"><div class="caption c-sec">Вас поблагодарили</div><div style="display:flex;justify-content:center;align-items:baseline;gap:6px;margin-top:4px"><span class="title" style="font-size:32px">37</span><span class="c-sec">человек</span></div><div class="caption c-sec">${ptsN(THANKS.reduce((a,th)=>a+Math.round(th.ton*CURK),0))} за 30 дней</div></div>
  <div class="caption c-mut">Сообщения приходят в одну сторону. Чтобы ответить, нажмите на ник — там Telegram и соцсети человека. Очки от благодарностей разблокируются за 3 дня — по трети в день.</div>
  ${THANKS.map(th=>{ const tr = byId(th.trail); return `<div class="box" style="display:flex;flex-direction:column;gap:6px">
    <div class="top" style="display:flex;justify-content:space-between;align-items:center"><button class="strong c-acc" data-a="person" data-v="${esc(th.from)}">@${esc(th.from)}</button><span class="strong c-suc">+${ptsN(Math.round(th.ton*CURK))}</span></div>
    <div class="caption c-mut">${th.at} · ${tr?esc(tr.frags[0].text.slice(0,40))+'…':''}</div>
    ${th.text?`<div class="body">${esc(th.text)}</div>`:'<div class="caption c-mut">Без сообщения</div>'}</div>`; }).join('')}
  <div class="caption c-mut center">Ещё 33 благодарности — в рабочей версии</div></div></div>`;
const rewardPts = () => `<div class="screen">${topbar('Как работает X3D')}<div class="scroll pad" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px">
  <div class="body c-sec">X3D — это буст: Тропу увидят ещё 36 человек. В Telegram-версии DEMOS буст и благодарности — на очках.</div>
  ${[['1. Очки',`${ptsN(PTS_START)} при входе и +${PTS_SHARE} за каждую бесплатную раздачу Тропы.`],['2. Буст',`${ptsN(10)}, ${ptsN(100)} или ${ptsN(1000)}. Очки списываются, Тропа получает +36 человек. Вы автоматически подписываетесь на Тропу.`],['Коэффициент ×0,7–×2,0',KA_TEXT],['3. Охват','Одинаковый при любой сумме: +36 человек. Сумма влияет только на Money Trust Тропы.'],['4. Награда автору','Какой % очков за буст отдать автору. Передаётся, когда Тропа завершится; изменить можно в любой момент до этого.'],['Стейкинг','Когда Тропа завершится, расчёт — сразу со всеми, даже у тех, кто получил максимум. Итог разблокируется за 3 дня — по трети в день. Так же у автора.'],['5. Благодарность','Очки автору отдельно от буста, с сообщением до 500 знаков. За одну Тропу — один раз.'],['6. Только очки','Очки нельзя купить, вывести или обменять на деньги.']].map(b=>`<div><div class="strong">${b[0]}</div><div class="caption c-sec">${b[1]}</div></div>`).join('')}</div></div>`;
function pointsHTML(){ releaseVested();
  const log = S.pts.log.slice(0,8);
  return `<div class="pad" style="display:flex;flex-direction:column;gap:12px;padding-bottom:24px">
    <div class="box"><div class="caption c-sec">Очки</div><div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap"><span class="title">${fmt(ptsBal())}</span><span class="c-sec">${ptsWord(ptsBal())}</span>${ptsLocked()?`<span class="caption c-sec">+ ${fmt(ptsLocked())} в стейкинге</span>`:''}</div>
      ${(S.pts.vest||[]).map(v => `<div class="caption c-mut">${esc(v.text)}: ${fmt(v.got)} из ${fmt(v.total)} · следующая треть через ${hhmm(vestNext(v.start, v.test))}${v.test?' (в тесте сутки = 1 мин)':''}</div>`).join('')}
      <div class="caption c-sec" style="margin-top:2px">${ptsN(PTS_START)} при входе, +${PTS_SHARE} за каждую раздачу и очки за буст (коэффициент ×0,7–×2,0). Тратятся на X3D и благодарности. Купить, вывести или обменять на деньги нельзя.</div></div>
    <div class="strong" style="margin-top:6px">История</div>
    <div>${log.map(e=>`<div class="kv"><span>${esc(e.text)}</span><span class="strong ${e.d>0?'c-suc':''}">${e.d>0?'+':'−'}${fmt(Math.abs(e.d))}</span></div>`).join('')}</div>
    <div class="strong" style="margin-top:6px">Мои X3D</div>
    ${S.myX3d.map(x=>{ const b = x.trail ? byId(x.trail).my.x3d : null;
      const tr = x.trail ? byId(x.trail) : null;
      if (b && b.before != null) return `<div class="box" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px"><div style="min-width:0"><div class="strong">${esc(x.title)}</div><div class="caption c-mut">${ptsN(b.pts)} · №${b.n}</div></div><span class="badge ${b.paid?'suc':'acc'}">${b.paid?'Завершён':'Идёт'}</span></div><div data-boost="${x.trail}" data-compact="1">${coefBar(tr, b, true)}</div>
        <div class="top caption" style="display:flex;justify-content:space-between;border-top:1px solid var(--b-default);padding-top:8px"><span class="c-sec">${b.tip?`Автору @${esc(tr.author)}: ${b.tip}% · ${ptsN(b.paid?(b.tipPaid||0):xTip(tr,b))}`:'Награда автору не выбрана'}</span>${b.paid?'':`<button class="c-acc" style="font-weight:600" data-a="tip-pts" data-id="${x.trail}">Изменить</button>`}</div></div>`;
      return `<div class="kv"><div><div class="strong">${esc(x.title)}</div><div class="caption c-mut">${curText(x.info)}</div></div><span class="badge mut">Завершён</span></div>`; }).join('')}
    <div class="strong" style="margin-top:6px">Вы как автор</div>
    <button class="kv" style="width:100%;text-align:left" data-a="go" data-to="thanks"><div><div>Благодарности</div><div class="caption c-mut">37 человек · с сообщениями</div></div><span class="c-acc">Открыть ›</span></button>
    <div class="box" style="margin-top:6px"><div class="strong">Пригласите друзей</div><div class="caption c-sec" style="margin:4px 0 8px">Отправьте ссылку — друг откроет DEMOS в Telegram.</div>
      <div style="display:flex;gap:8px;align-items:center"><div class="field" style="flex:1;padding:10px 12px"><span class="caption">${refLinkShort()}</span></div><button class="btn secondary" style="width:auto;padding:0 14px;height:42px;font-size:14px" data-a="copy">Копировать</button></div></div></div>`;
}
SHEETS.tipPts = p => { const t = byId(p.id), x = t.my.x3d;
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:12px"><div class="heading">Награда автору</div>
   <div class="caption c-sec">Какой % очков за буст отдать @${esc(t.author)}. Сейчас буст даёт ${ptsN(xNow(t,x))}. Передаётся, когда Тропа завершится; до этого можно изменить.</div>
   ${tipChooser(xNow(t,x), p.tip, p.tipCustom)}
   <button class="amt ${p.tip===0?'on':''}" style="height:40px" data-a="tip-pick" data-v="0">Без награды</button></div>
   <div class="foot"><button class="btn primary" data-a="tip-pts-save">Сохранить</button><button class="btn ghost" data-a="close">Отмена</button></div>`; };
SHEETS.x3d = p => PTS ? x3dPts(p) : x3dWeb(p);
SHEETS.boosted = p => PTS ? boostedPts(p) : boostedWeb(p);
SHEETS.thank = p => PTS ? thankPts(p) : thankWeb(p);
SHEETS.thanked = p => PTS ? thankedPts(p) : thankedWeb(p);
SCREENS.thanks = () => PTS ? thanksPts() : thanksWeb();
SCREENS.reward = () => PTS ? rewardPts() : rewardWeb();
SHEETS.person = p => { const a = PEOPLE[p.nick] || AUTHORS[p.nick] || {city:'',about:'',socials:[]};
  return `<div class="grab"></div><div class="sc" style="display:flex;flex-direction:column;gap:10px">
   <div><div class="heading">@${esc(p.nick)}</div><div class="caption c-sec">${esc(a.city||'')}</div></div>${a.about?`<div class="body">${esc(a.about)}</div>`:''}
   ${a.socials.length?`<div class="caption c-mut" style="margin-top:4px">Соцсети</div>${a.socials.map(s=>`<button class="kv" style="width:100%;text-align:left" data-a="link" data-v="${s[2]}"><span><span class="strong">${s[0]} · ${s[1]}</span></span><span class="c-acc">›</span></button>`).join('')}`:'<div class="caption c-mut">Соцсети не указаны</div>'}</div>
   <div class="foot"><button class="btn ghost" data-a="close">Закрыть</button></div>`; };
const thankedWeb = p => { const t = byId(p.id); return `<div class="grab"></div><div class="sc center" style="display:flex;flex-direction:column;gap:10px"><div class="icon-circle" style="background:var(--bg-success-soft);color:var(--t-success)">♥</div><div class="heading">Спасибо, что поблагодарили</div><div class="caption c-sec">@${t.author} получит ${fmt(p.v)} DEMOS${p.ton?` (${cur(p.ton)})`:''} за эту Тропу.</div>${p.text?`<div class="box caption" style="text-align:left"><span class="c-mut">Ваше сообщение</span><br>${esc(p.text)}</div>`:''}
   <div class="box" style="text-align:left"><div class="kv"><span class="k">Поблагодарили за эту Тропу</span><span class="v">38 человек</span></div><div class="kv"><span class="k">Всего благодарностей</span><span class="v c-suc">12 896 DEMOS</span></div></div>
   ${p.sig?`<button class="caption c-acc" data-a="link" data-v="${SOL_EXPLORER(p.sig)}">Транзакция в Solana Explorer (Devnet) ↗</button>`:''}
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
  // тот же экран перерисовывается (награда автору, вывод и т. п.) — прокрутка остаётся на месте (исправлено 25.10)
  const keep = (!forward && S._lastScreen === S.screen) ? [...$app.querySelectorAll('.scroll')].map(e => e.scrollTop) : null;
  const html = SCREENS[S.screen] ? SCREENS[S.screen]() : '';
  $app.innerHTML = html;
  if (keep) [...$app.querySelectorAll('.scroll')].forEach((e, i) => { if (keep[i]) e.scrollTop = keep[i]; });
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
    if (!dragging && dy < 10) return; // небольшое движение пальца при нажатии — это тап, а не свайп (iOS)
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
async function pushEnable(){
  if (typeof Notification==='undefined') return 'Этот браузер не поддерживает уведомления';
  const p = await Notification.requestPermission(); PUSH.perm = p;
  if (p!=='granted') return 'Уведомления не разрешены';
  toast('Подключаем уведомления…');
  const r = await swReg(); if (!r) return 'Не удалось подключить уведомления';
  const limit = ms => new Promise((_,rej)=>setTimeout(()=>rej(new Error('нет ответа от сервиса уведомлений')), ms));
  try{ await Promise.race([navigator.serviceWorker.ready, limit(10000)]); const sb = await Promise.race([r.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(VAPID_PUBLIC)}), limit(15000)]); PUSH.sub = JSON.stringify(sb); return 'Уведомления включены'; }
  catch(e){ return 'Подписка не удалась: '+(e && e.message || e); } }
A['push-on'] = async () => { const m = await pushEnable(); render(false); toast(m); };
// онбординг (решено 23.10): в веб-версии после тем — шаг «Включите уведомления»
const askNotif = () => WEB && typeof Notification!=='undefined' && Notification.permission==='default';
A['ob-notif'] = async () => { const m = await pushEnable(); obDone(); toast(m); };
A['ob-later'] = () => obDone();
A['invite-go'] = () => { const v = (document.getElementById('invite-in')||{}).value||''; let code = '';
  try{ const u = new URL(v.trim()); code = u.searchParams.get('ref') || u.searchParams.get('startapp') || u.searchParams.get('start') || ''; }catch(e){ code = v.trim(); }
  code = code.replace(/^@/,'').replace(/^ref_/,'');
  if (!/^[A-Za-z0-9_.]{3,32}$/.test(code)){ const er = document.getElementById('invite-err'); if (er) er.classList.remove('hidden'); return; }
  store.set('invitedBy', {code, at:new Date().toISOString()}); keepRefInUrl(); go('invited', {}, false); };
A['install-do'] = async () => { if (!installEvt) return render(false); installEvt.prompt(); try{ const c = await installEvt.userChoice; installEvt = null; if (c && c.outcome==='accepted') go('opened', {}, false); else render(false); }catch(e){ render(false); } };
A['install-ios'] = () => { go('opened', {}, false); };
A['install-manual'] = () => { go('opened', {}, false); };
A['install-open'] = async () => { if (installEvt){ installEvt.prompt(); try{ const c = await installEvt.userChoice; installEvt = null; if (c && c.outcome==='accepted') toast('DEMOS установлен на главный экран'); }catch(e){} render(false); } else go('install'); };
A['install-hide'] = () => { store.set('installHideAt', Date.now()); render(false); };
A['notif-req'] = async () => { if (typeof Notification==='undefined'){ toast('Это устройство не поддерживает уведомления'); return go('geoReq', {}, false); }
  const m = await pushEnable(); if (PUSH.perm==='granted'){ go('geoReq', {}, false); toast(m); } else go('notifOff', {}, false); };
A['notif-check'] = async () => { if (typeof Notification!=='undefined' && Notification.permission==='granted'){ const m = await pushEnable(); go('geoReq', {}, false); toast(m); } else toast('Уведомления всё ещё выключены'); };
A['geo-req'] = () => { toast('Определяем местоположение…');
  locate((r, why) => { if (!r){ if (why==='denied') return go('geoOff', {}, false); toast('Не удалось определить местоположение — попробуйте ещё раз на улице или у окна'); return; }
    S.mapPoint = {lat:r.lat, lon:r.lon, acc:r.acc, src:'gps', label:''}; go('map', {mode:'onboard'}, false); reverseGeocode(r.lat, r.lon, lbl => { S.mapPoint.label = lbl; setText('map-label', lbl); }); }); };
A['push-test'] = () => { toast('Через 5 секунд придёт уведомление — можно свернуть DEMOS');
  setTimeout(async () => { try{ const r = await navigator.serviceWorker.ready; await r.showNotification('Вам раздали Тропу · 1,2 км от вас', {body:'«Рыжий метис в синем ошейнике, убежал у Крымского вала…»', icon:'icon-192.png', badge:'icon-192.png', tag:'test', renotify:true, data:{url:'./'}}); }catch(e){ toast('Не получилось показать уведомление'); } }, 5000); };
A.back = () => back();
A.close = () => closeSheet();
A.go = el => go(el.dataset.to, {});
A['ob-next'] = el => go(el.dataset.to, {}, false);
// тестовый вход: настоящий вход появится вместе с сервером (имя бота и домен — в @BotFather)
A['login-existing'] = () => go('login', {existing:true});
A['tg-login'] = () => { const existing = !!S.params.existing; store.set('tgUser', {username:'marsaon', at:new Date().toISOString(), test:true});
  if (existing){ obDone(); } else go('ob1', {}, false);
  toast('Вы вошли через Telegram как @marsaon'); };
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
  if (mode==='onboard' && !S.onboarded) go('tags1', {}, false); else { back(); toast('Точка сохранена'); } };
A.topic = el => { const v = el.dataset.v; S.topics.has(v)?S.topics.delete(v):S.topics.add(v); render(false); };
A.detail = el => { const v = el.dataset.v; S.details.has(v)?S.details.delete(v):S.details.add(v); render(false); };
A['ob-finish'] = () => { if (!WEB && askNotif() && S.screen!=='notif') return go('notif'); obDone(); };
function obDone(){ S.onboarded = true; store.set('onboarded', true); [...S.topics, ...S.details].forEach(x=>S.subs.add(x)); store.set('subs',[...S.subs]); S.stack=[]; S.screen='main'; S.tab='feed'; render(true); };
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
A.share = el => { const t = byId(el.dataset.id); t.my.shared = true; t.shares++; haptic('medium'); if (PTS) ptsAdd(PTS_SHARE, 'Раздача Тропы'); refreshCard(t.id); toast(PTS ? `Тропу получат ещё 12 человек · +${PTS_SHARE} очков` : 'Тропу получат ещё 12 человек рядом с вами'); };
A.x3d = el => { if (S.restricted) return toast('Буст недоступен в вашей стране. Раздавать Тропу бесплатно можно.'); openSheet('x3d', {id:el.dataset.id, amount:10}); };
A['x3d-amt'] = el => { S.sheet.params.amount = +el.dataset.v; renderSheet(); haptic(); };
A['tip-pick'] = el => { const v = el.dataset.v; const p = S.sheet.params; p.tip = v==='custom' ? 'custom' : (p.tip===+v && v!=='0' ? null : +v); renderSheet(); if (v==='custom'){ const i=document.getElementById('tip-custom'); if(i) i.focus(); } };
A['tip-edit'] = el => { const i = +el.dataset.i, l = S.lots[i]; openSheet('tipEdit', {i, tip:[0,...TIP_OPTS].includes(l.tip||0)?(l.tip||0):'custom', tipCustom:[0,...TIP_OPTS].includes(l.tip||0)?'':String(l.tip)}); };
A['tip-save'] = () => { const p = S.sheet.params, l = S.lots[p.i]; l.tip = tipValue(p); closeSheet(); render(false); toast(l.tip?`Награда автору: ${l.tip}%`:'Без награды автору'); };
A['x3d-other'] = () => { const p = S.sheet.params; p.other = true; p.amount = +p.otherVal || 0; renderSheet(); const i=document.getElementById('x3d-other-in'); if(i) i.focus(); };
A.resident = () => { S.residentOk = !S.residentOk; renderSheet(); };
// оплата X3D. Перед отправкой в кошелёк сервер берёт свежую цену; если она ушла больше чем на 1% от цены на экране —
// окно «Цена DEMOS изменилась», покупатель подтверждает ещё раз (решено 23.10). В тестовой версии свежая цена условно сдвигается до ±2%.
const PRICE_TOLERANCE = 1; // %
const freshQuote = () => Math.max(1, Math.round(S.rate*(1+(Math.random()*4-2)/100)));
A['x3d-pay'] = el => { const id = el.dataset.id, a = S.sheet.params.amount || 10; if (PTS) return payPts(id, a, tipValue(S.sheet.params)); S.residentDone = true;
  const tip = tipValue(S.sheet.params), shown = S.rate, fresh = freshQuote();
  if (Math.abs(fresh/shown-1)*100 > PRICE_TOLERANCE){ haptic('medium'); return openSheet('priceChanged', {id, amount:a, tip, old:shown, rate:fresh}); }
  doPay(id, a, tip, shown); };
A['price-confirm'] = () => { const p = S.sheet.params; S.rate = p.rate; S.rateAt = Date.now(); if (p.kind==='thank') doThank(p.id, p.amount, p.text, p.rate); else doPay(p.id, p.amount, p.tip, p.rate); };
A['thank-pay'] = () => { const p = S.sheet.params, v = thankTon(p); if (v<1) return; if (PTS) return thankPtsDo(p.id, v, p.text||''); S.residentDone = true; const shown = S.rate, fresh = freshQuote();
  if (Math.abs(fresh/shown-1)*100 > PRICE_TOLERANCE){ haptic('medium'); return openSheet('priceChanged', {kind:'thank', id:p.id, amount:v, text:p.text||'', old:shown, rate:fresh}); }
  doThank(p.id, v, p.text||'', shown); };
async function doThank(id, ton, text, rate){
  if (WEB) return walletPay({kind:'thank', id, ton, text, rate, amountSol: ton*CURK});
  openSheet('paying', {amount:ton}); await new Promise(r=>setTimeout(r,1400)); finishThank(id, ton, text, rate, null); }
function finishThank(id, ton, text, rate, sig){
  const t = byId(id), demos = Math.round(ton*rate); t.my.thanked = true; S.sentThanks.unshift({to:t.author, trail:id, ton, demos, text, sig});
  haptic('heavy'); openSheet('thanked', {id, v:demos, ton, text, sig}); refreshCard(id); }
// очки (Telegram-версия): списание сразу, без кошелька и цены
function saveBoosts(){ if (!PTS) return; const o = {}; S.trails.forEach(t => { if (t.my.x3d && t.my.x3d.before != null) o[t.id] = {x:t.my.x3d, vol:trailVol(t), x3d:t.x3d}; }); store.set('ptsBoosts', o); }
function settleBoost(t){ const x = t.my.x3d; if (!x || x.paid) return; x.paid = Math.round(kaPay(trailVol(t), x.before, x.pts)); x.coefFinal = x.paid/x.pts; x.tipPaid = Math.round(x.paid*(x.tip||0)/100);
  ptsVest(x.paid - x.tipPaid, `буст ${coefStr(x.coefFinal)} · ` + t.frags[0].text.slice(0,18) + '…'); saveBoosts(); }
function payPts(id, a, tip){ const t = byId(id), cost = Math.round(a*CURK); if (ptsBal() < cost) return;
  ptsAdd(-cost, 'X3D · ' + t.frags[0].text.slice(0,24) + '…');
  const before = trailVol(t); t.vol = before + cost;
  t.my.x3d = {amount:a, pts:cost, before, n:t.x3d+1, at:Date.now(), closeAt:Date.now()+TEST_CLOSE_MIN*60000, tip, paid:0};
  if (!t.my.shared){ t.shares++; t.my.shared = true; } t.x3d++; t.my.subscribed = true; // автоматическая подписка на Тропу
  S.myX3d.unshift({title:t.frags[0].text.slice(0,34)+'…', st:'Буст', info:ptsN(cost), rew:'', trail:id});
  saveBoosts(); haptic('heavy'); openSheet('boosted', {id}); refreshCard(id); simulateBoost(id); }
A['tip-pts'] = el => { const x = byId(el.dataset.id).my.x3d, v = x.tip||0; openSheet('tipPts', {id:el.dataset.id, tip:[0,...TIP_OPTS].includes(v)?v:'custom', tipCustom:[0,...TIP_OPTS].includes(v)?'':String(v)}); };
A['tip-pts-save'] = () => { const p = S.sheet.params, x = byId(p.id).my.x3d; if (!x.paid) x.tip = tipValue(p); saveBoosts(); closeSheet(); render(false); toast(x.tip?`Награда автору: ${x.tip}%`:'Без награды автору'); };
function thankPtsDo(id, v, text){ const t = byId(id), pts = Math.round(v*CURK); if (ptsBal() < pts) return;
  ptsAdd(-pts, 'Благодарность @' + t.author); t.my.thanked = true; S.sentThanks.unshift({to:t.author, trail:id, ton:v, demos:0, pts, text});
  haptic('heavy'); openSheet('thanked', {id, v:pts, text}); }
async function doPay(id, a, tip, rate){
  if (WEB) return walletPay({kind:'x3d', id, a, tip, rate, amountSol: a*CURK});
  openSheet('paying', {amount:a}); await new Promise(r=>setTimeout(r,1400)); finishPay(id, a, tip, rate, null); }
function finishPay(id, a, tip, rate, sig){
  { const t = byId(id); const demos = a*rate;
    const before = trailVol(t); t.vol = before + a;
    const lot = {at:Date.now(), demos, trail:id, title:t.frags[0].text.slice(0,34)+'…', ton:a, author:t.author, tip, sig, before, n:t.x3d+1, settled:false, closeAt:Date.now()+TEST_CLOSE_MIN*60000};
    t.my.x3d = {amount:a, demos, at:Date.now(), tip, lot};
    if (!t.my.shared){ t.shares++; t.my.shared = true; } t.x3d++; t.my.subscribed = true; // автоматическая подписка на Тропу
    S.lots.push(lot); // каждая покупка — отдельно, для комиссии при выводе
    saveWebLots();
    S.myX3d.unshift({title:t.frags[0].text.slice(0,34)+'…', st:'На счёте', info:cur(a), rew:`${fmt(demos)} DEMOS`});
    haptic('heavy'); openSheet('boosted', {id, sig}); refreshCard(id); simulateBoost(id); } }
// полная версия: покупки и объёмы Троп сохраняются на устройстве (до сервера)
function saveWebLots(){ if (PTS) return; store.set('solLots', S.lots.filter(l => l.settled !== undefined || l.sig || l.withdrawn)); const v = {}; S.trails.forEach(t => { if (t.vol != null) v[t.id] = {vol:t.vol, x3d:t.x3d}; }); store.set('webVols', v); }
function settleLots(t){ S.lots.forEach(l => { if (l.trail === t.id && l.settled === false){ l.k = kaCoef(trailVol(t), l.before, l.ton); l.settled = true; l.settledAt = Date.now(); l.test = true; } }); saveWebLots(); }
function simulateBoost(id){ const t = byId(id); const iv = setInterval(()=>{ const x = t.my.x3d; if(!x){clearInterval(iv);return;}
  if (PTS){ if (x.paid){ clearInterval(iv); return; }
    // тест: после вас другие покупают X3D этой Тропы (в рабочей версии — настоящие покупки)
    if (Math.random() < 0.6){ const amt = [10,10,100,100,100,1000][Math.floor(Math.random()*6)]; t.vol = trailVol(t) + amt; t.x3d++; }
    if (!closeLeft(x) || t.status==='finished'){ settleBoost(t); clearInterval(iv); if (!S.sheet) toast(`Тропа завершилась: буст ${coefStr(x.coefFinal)} · +${ptsN(x.paid - x.tipPaid)}`); } else saveBoosts();
    document.querySelectorAll(`[data-boost="${id}"]`).forEach(el => { el.innerHTML = coefBar(t, x, el.dataset.compact==='1'); });
    document.querySelectorAll(`[data-boostcard="${id}"]`).forEach(el => { el.innerHTML = ptsBlock(t); });
    if (x.paid && !S.sheet && S.screen==='main' && S.tab==='profile') render(false);
    return; }
  // полная версия (тест): после вас другие покупают X3D этой Тропы; Тропа «завершается» через 3 мин
  const lot = x.lot; if (!lot || lot.settled !== false){ clearInterval(iv); return; }
  if (Math.random() < 0.6){ t.vol = trailVol(t) + [1,1,10,10,10,100][Math.floor(Math.random()*6)]; t.x3d++; }
  if (Date.now() >= lot.closeAt){ settleLots(t); clearInterval(iv); if (!S.sheet) toast(`Тропа завершилась: ${coefStr(lot.k)} · +${fmt(lotDemos(lot))} DEMOS`); } else saveWebLots();
  document.querySelectorAll(`[data-webcard="${id}"]`).forEach(el => { el.innerHTML = webBlock(t); });
  document.querySelectorAll(`[data-lotbar="${id}"]`).forEach(el => { el.innerHTML = kaBarHTML(lotK(lot), lot.demos, lotDemos(lot), !el.dataset.full); });
  if (lot.settled && !S.sheet && S.screen==='main' && S.tab==='profile') render(false); }, 4000); }
if (WEB){ const v = store.get('webVols', {}); Object.keys(v).forEach(id => { const t = byId(id); if (t){ t.vol = v[id].vol; t.x3d = v[id].x3d; } });
  S.lots.forEach(l => { if (l.settled === undefined) return; const t = byId(l.trail); if (!t) return; t.my.x3d = {amount:l.ton, demos:l.demos, at:l.at, tip:l.tip, lot:l}; t.my.shared = true; t.my.subscribed = true;
    if (l.settled === false){ if (Date.now() >= l.closeAt) settleLots(t); else simulateBoost(t.id); } }); }
if (PTS){ const saved = store.get('ptsBoosts', {}); Object.keys(saved).forEach(id => { const t = byId(id), sv = saved[id]; if (!t || !sv || !sv.x || sv.x.before == null) return;
    t.my.x3d = sv.x; t.vol = sv.vol; t.x3d = sv.x3d; t.my.shared = true; t.my.subscribed = true;
    if (!S.myX3d.some(m=>m.trail===id)) S.myX3d.unshift({title:t.frags[0].text.slice(0,34)+'…', st:'Буст', info:ptsN(t.my.x3d.pts), rew:'', trail:id});
    if (!t.my.x3d.paid){ if (!closeLeft(t.my.x3d)) settleBoost(t); else simulateBoost(id); } }); }
A['dl-connect'] = () => { if (!window.nacl){ toast('Секунду…'); loadNacl().catch(()=>{}); return; } location.href = dlConnectUrl(); };
A['dl-go'] = () => { if (S.dlUrl) location.href = S.dlUrl; };
A.mt = el => openSheet('mt', {id:el.dataset.id});
A.comments = el => openSheet('comments', {id:el.dataset.id});
A.reply = el => { S.replyTo = {id:+el.dataset.v, who:el.dataset.who}; renderSheet(); setTimeout(()=>{const i=document.getElementById('cmt'); i&&i.focus();},50); };
A['reply-cancel'] = () => { S.replyTo = null; renderSheet(); };
A['send-comment'] = el => { const i = document.getElementById('cmt'); const v = (i&&i.value||'').trim().slice(0,500); if(!v) return;
  const c = {id:Date.now(), who:'marsaon', ago:'сейчас', text:v, replies:[]};
  if (S.replyTo){ const p = S.comments.find(x=>x.id===S.replyTo.id); p && p.replies.push(c); S.replyTo=null; } else S.comments.unshift(c);
  const t = byId(el.dataset.id); t.comments++; renderSheet(); refreshCard(t.id); };
A['del-comment'] = el => { const id = +el.dataset.v; S.comments = S.comments.filter(c=>c.id!==id).map(c=>({...c, replies:c.replies.filter(r=>r.id!==id)})); renderSheet(); };
A.author = el => openSheet('author', {id:el.dataset.id});
A.person = el => openSheet('person', {nick:el.dataset.v});
A.sheet = el => openSheet(el.dataset.s, {id:el.dataset.id});
A['thank-v'] = el => { const p = S.sheet.params, v = el.dataset.v; p.v = v==='custom' ? 'custom' : (p.v===+v ? null : +v); renderSheet(); if (v==='custom'){ const i=document.getElementById('thank-custom'); if(i) i.focus(); } };
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
A.reset = () => { try{localStorage.removeItem('demos_onboarded'); localStorage.removeItem('demos_obStep');}catch(e){} S.onboarded=false; S.stack=[]; go(WEB&&!inviteCode()?'invite':'splash',{},false); setTimeout(()=>{ if (S.screen==='splash') go(WEB?'invited':'ob1',{},false); },1800); };
A.saved = () => { back(); toast('Профиль сохранён'); };
A.copy = () => { try{ const pr = navigator.clipboard && navigator.clipboard.writeText(refLink()); pr && pr.catch && pr.catch(()=>{}); }catch(e){} toast('Ссылка скопирована'); };
A.ton = async () => { if (WEB){ if (S.wallet.ton){ solDisconnect(); render(false); return toast('Кошелёк отключён'); } const pk = await solConnect(); if (pk){ render(false); toast('Phantom подключён · ' + shortPk(pk)); } return; }
  S.wallet.ton = S.wallet.ton ? null : 'UQB…3fA2'; render(false); toast(S.wallet.ton?'Кошелёк подключён (тест)':'Кошелёк отключён'); };
A['withdraw-do'] = async () => { if (!S.wallet.ton){ if (WEB){ const pk = await solConnect(); if (pk){ render(false); toast('Phantom подключён · ' + shortPk(pk)); } return; } S.wallet.ton = 'UQB…3fA2'; render(false); return toast('Кошелёк подключён (тест)'); }
  const out = netOut(); readyLots().forEach(l => { l.withdrawn = (l.withdrawn||0) + lotAvail(l); });
  const gone = S.lots.filter(l => l.settled !== false && lotLeft(l) <= 0).map(l=>l.title); S.lots = S.lots.filter(l => !(l.settled !== false && lotLeft(l) <= 0)); saveWebLots();
  S.myX3d.forEach(x=>{ if (x.st==='На счёте' && gone.includes(x.title)) x.st='Выведено'; }); back(); toast(`Отправлено ${fmt(out)} DEMOS на кошелёк (тест)`); };

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
    const pay = document.getElementById('x3d-pay'); if (pay){ pay.disabled = !(ok && (S.residentOk||S.residentDone)); pay.textContent = ok ? `Оплатить ${cur(n)}` : 'Введите сумму'; } }
  if (k==='thank-text'){ S.sheet.params.text = e.target.value.slice(0,500); const c = document.getElementById('thank-cnt'); if (c) c.textContent = `${S.sheet.params.text.length}/500`; }
  if (k==='thank-custom'){ const p = S.sheet.params; let clean = e.target.value.replace(/[^\d.,]/g,'').replace(/([.,].*)[.,]/,'$1'); if (clean!==e.target.value) e.target.value = clean; p.custom = clean;
    const v = thankTon(p), ok = v>=1; const set=(id,t)=>{const el=document.getElementById(id); if(el) el.textContent=t;};
    if (PTS){ const pts = Math.round(v*CURK), enough = ptsBal() >= pts; set('thank-out', ok?ptsN(pts):'—'); set('thank-small', ok?fmt(pts):'от 10'); set('thank-lack', ptsLack(pts));
      const lk = document.getElementById('thank-lack'); if (lk) lk.classList.toggle('hidden', !(ok && !enough));
      const b = document.getElementById('thank-pay'); if (b){ b.disabled = !(ok && enough); b.textContent = ok?`Отправить ${ptsN(pts)}`:'Выберите сумму'; } return; }
    set('thank-out', ok?'≈ '+fmt(Math.round(v*S.rate))+' DEMOS':'—'); set('thank-small', ok?fmt(Math.round(v*S.rate)):'от '+cur(1));
    const b = document.getElementById('thank-pay'); if (b){ b.disabled = !(ok && (S.residentOk||S.residentDone)); b.textContent = ok?`Оплатить ${cur(v)}`:'Выберите сумму'; } }
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
// веб: код приглашения из ссылки ?ref=; держим его в адресе, чтобы установленное приложение открылось с ним
function keepRefInUrl(){ try{ const c = inviteCode(); if (WEB && c && new URLSearchParams(location.search).get('ref')!==c) history.replaceState(null, '', location.pathname + '?ref=' + encodeURIComponent(c)); }catch(e){} }
if (WEB){ try{ const q = new URLSearchParams(location.search).get('ref'); if (q && /^[A-Za-z0-9_.]{3,32}$/.test(q.replace(/^ref_/,'')) && !store.get('invitedBy', null)) store.set('invitedBy', {code:q.replace(/^ref_/,''), at:new Date().toISOString()}); }catch(e){} keepRefInUrl(); }
const webStart = () => !inviteCode() ? 'invite' : 'splash';
S.screen = S.onboarded ? 'main' : (WEB ? webStart() : 'splash');
render(true);
if (WEB) setTimeout(() => { dlReturn(); }, 0); // возврат из Phantom (?ph=connect|sign)
if (!S.onboarded && S.screen==='splash') setTimeout(()=>{ if (S.screen==='splash') go(WEB ? 'invited' : 'ob1', {}, false); }, 1800);
window.DEMOS = {S, reset(){ try{localStorage.removeItem('demos_onboarded');}catch(e){} location.reload(); }};
})();
