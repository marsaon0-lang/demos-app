// Заглушки медиа: SVG-картинка (градиент + контурный рисунок). В рабочей версии — фото и видео пользователей.
const ICONS = {
  dog:'<path d="M70 150c0-30 20-55 50-55s50 25 50 55v25H70z"/><path d="M85 100l-15-35 30 20M155 100l15-35-30 20"/><circle cx="105" cy="125" r="4"/><circle cx="135" cy="125" r="4"/><path d="M112 145h16l-8 8z"/><path d="M80 175v20M160 175v20"/><path d="M95 112h50" stroke-dasharray="3 6"/>',
  paper:'<rect x="70" y="60" width="100" height="130" rx="6"/><path d="M85 85h70M85 105h70M85 125h50"/><circle cx="120" cy="160" r="14"/>',
  drop:'<path d="M120 55c25 40 45 65 45 95a45 45 0 0 1-90 0c0-30 20-55 45-95z"/><path d="M100 150a20 20 0 0 0 20 20"/><path d="M112 118h16M120 110v16"/>',
  people:'<circle cx="90" cy="95" r="18"/><circle cx="150" cy="95" r="18"/><path d="M60 175c0-30 15-48 30-48s30 18 30 48M120 175c0-30 15-48 30-48s30 18 30 48"/>',
  tree:'<path d="M120 190v-50"/><path d="M120 140c-35 0-50-20-50-42 0-25 22-43 50-43s50 18 50 43c0 22-15 42-50 42z"/><path d="M95 190h50"/>',
  stump:'<ellipse cx="120" cy="140" rx="40" ry="12"/><path d="M80 140v35c0 7 18 12 40 12s40-5 40-12v-35"/><path d="M120 140l-30-60M120 140l35-55" stroke-dasharray="5 7"/>',
  person:'<circle cx="120" cy="80" r="20"/><path d="M90 190l10-60 20-25 20 25 10 60"/><path d="M100 130l-15 25M140 130l15 25"/><path d="M104 66c8-10 24-10 32 0"/>',
  flash:'<rect x="98" y="90" width="44" height="80" rx="8"/><path d="M104 90l-14-30h60l-14 30"/><path d="M70 55l-20-20M170 55l20-20M120 45V20"/>',
  pipe:'<path d="M40 130h70v30H40zM130 130h70v30h-70z"/><path d="M110 130c5-10 15-10 20 0"/><path d="M118 165c-4 10-12 16-12 24a14 14 0 0 0 28 0c0-8-8-14-12-24"/><path d="M95 112c4-8 4-14 0-22M145 112c4-8 4-14 0-22"/>',
  tape:'<path d="M30 110l180 30M30 140l180 30" stroke-dasharray="14 10"/><path d="M60 100v90M180 100v90"/>',
  cone:'<path d="M100 180l20-110 20 110z"/><path d="M106 145h28M111 115h18"/><path d="M80 182h80"/>',
  moon:'<path d="M150 60a45 45 0 1 0 25 75 38 38 0 0 1-25-75z"/><path d="M50 185h140M70 185v-25h40v25"/>',
  swing:'<path d="M70 190l25-120h50l25 120"/><path d="M110 70v70M130 70v70"/><path d="M104 140h32"/><path d="M170 120l30 20" stroke-dasharray="4 6"/>',
  bag:'<path d="M80 95h80l-8 95H88z"/><path d="M100 95c0-20 40-20 40 0"/><path d="M60 190h120"/>',
  photo:'<rect x="60" y="75" width="120" height="90" rx="10"/><circle cx="120" cy="120" r="24"/><path d="M90 75l10-14h40l10 14"/>'
};
function artSVG(key){
  const a = ART[key] || ART.user;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="g" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="${a.g[0]}"/><stop offset="1" stop-color="${a.g[1]}"/></radialGradient></defs>
<rect width="240" height="320" fill="url(#g)"/>
<g transform="translate(0,40)" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[a.icon]||''}</g></svg>`;
  return `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g,"%27")}')`;
}
