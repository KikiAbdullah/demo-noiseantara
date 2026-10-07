import { releases, artists, cities, artistBySlug, artistOf, coverPath } from './data.js';
import { gigs, zines } from './extended-data.js';


const canvas = document.getElementById('posterCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const typeField = document.getElementById('captureType');
const entryField = document.getElementById('captureEntry');
const downloadButton = document.getElementById('downloadButton');
const shareButton = document.getElementById('shareButton');
const statusNode = document.getElementById('captureStatus');
const previewName = document.getElementById('previewName');
const backHeader = document.getElementById('backHeader');
const W = 1080, H = 1920;
const DARK = '#151a15', PAPER = '#f1f0e8', MID = '#263128';
const COLORS = { lime: '#d2f26b', coral: '#ed7757', lavender: '#b5a6ed' };
const collections = { rilisan: releases, gig: gigs, zine: zines, artis: artists };
const labels = { rilisan: 'RILISAN', gig: 'GIG', zine: 'ZINE', artis: 'ARTIS', label: 'LABEL', pustaka: 'PUSTAKA' };
const names = { rilisan: item => item.title, gig: item => item.title, zine: item => item.name, artis: item => item.name, label: item => item.name || item.title, pustaka: item => item.title || item.name };



function readDbIndex() {
  try {
    const node = document.getElementById('capture-db');
    const parsed = JSON.parse(node ? node.textContent : '{}');
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {  }
  return (window.__CAPTURE_DB__ && typeof window.__CAPTURE_DB__ === 'object') ? window.__CAPTURE_DB__ : {};
}
const dbIndex = readDbIndex();

// Sampul cadangan digambar lokal (bukan file aset fiktif): entri yang belum
// punya artwork harus tampil jujur "belum terdokumentasi", bukan memakai
// sampul band lain yang tidak ada hubungannya.
const placeholderCover = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">' +
  '<rect width="1000" height="1000" fill="#1b261d"/>' +
  '<rect x="58" y="58" width="884" height="884" fill="none" stroke="#3d4a3a" stroke-width="3"/>' +
  '<circle cx="500" cy="455" r="185" fill="none" stroke="#5d7555" stroke-width="6"/>' +
  '<circle cx="500" cy="455" r="24" fill="#5d7555"/>' +
  '<text x="500" y="745" fill="#c3cfbf" font-family="monospace" font-size="33" text-anchor="middle" letter-spacing="4">SAMPUL BELUM</text>' +
  '<text x="500" y="793" fill="#c3cfbf" font-family="monospace" font-size="33" text-anchor="middle" letter-spacing="4">TERDOKUMENTASI</text>' +
  '</svg>'
);

function dbItemFor(type, row) {
  const title = row.title || row.slug;
  const base = {
    fromDb: true,
    slug: row.slug,
    title,
    name: title,
    city: row.city || 'jawa-timur',
    city_name: row.city_name || '',
    year: row.year || '',
    cover: row.cover || null,
  };
  if (type === 'rilisan') return {
    ...base,
    artist: row.artist_slug || null,
    artistName: row.artist || '',
    genre: (row.genres || []).join(' / '),
    genres: row.genres || [],
    format: (row.format || []).join(', '),
    typeLabel: row.type_label || 'Rilisan',
    precision: row.precision || 'ARSIP',
    dateText: row.date_text || '',
    labelName: row.label || '',
    description: row.description || title,
    tracks: row.tracks || [],
  };
  if (type === 'gig') return {
    ...base,
    date: row.date_text || [title, row.city_name, row.year].filter(Boolean).join(' / '),
    precision: row.precision || 'ARSIP',
    venue: row.venue || 'Belum terdokumentasi',
    description: row.description || title,
    lineup: (row.lineup || []).map(l => ({ text: l.text })),
  };
  if (type === 'zine') return {
    ...base,
    period: row.period || 'KATALOG',
    style: row.style || 'ARSIP',
    issues: row.issues || [],
    description: row.description || title,
  };
  if (type === 'artis') return {
    ...base,
    formed: row.year || '',
    genres: row.genres || [],
    short: row.short || row.description || title,
    description: row.description || title,
    releases: row.releases || [],
  };
  if (type === 'label') return {
    ...base,
    period: 'KATALOG LABEL',
    description: row.description || `Katalog rilisan ${title}.`,
    releases: row.releases || [],
  };
  return { ...base, summary: row.summary || title, description: row.description || row.summary || title };
}
function dbCollection(type) {
  const rows = Array.isArray(dbIndex[type]) ? dbIndex[type] : [];
  return rows.map(row => dbItemFor(type, row));
}
function liveCollection(type) {
  const db = dbCollection(type);
  if (db.length) return db;
  return collections[type] || [];
}
// Aksen kartu sudah tetap (Hijau Acid) — pilihan AKSEN WARNA dihapus,
// jadi tidak ada lagi state `palette` yang perlu disimpan.
const ACCENT = 'lime';
let activeItem = null;
let ready = false;
let requestId = 0;
let pngBlob = null;
const imageCache = new Map();

const city = slug => {
  const hit = cities.find(item => item.slug === slug);
  if (hit) return hit.name;
  for (const list of Object.values(dbIndex)) {
    const row = (list || []).find(r => r.slug === slug || r.city === slug);
    if (row?.city_name) return row.city_name;
  }
  return 'Jawa Timur';
};
const fontDisplay = '"Barlow Condensed", Impact, "Arial Narrow", sans-serif';

// Logo resmi dipakai untuk SEMUA lambang di dalam poster (masthead, footer,
// dan stiker bekas lingkaran). URL-nya dikirim Blade lewat `data-logo-src`
// supaya ikut cache-busting `n_asset()` seperti aset lain.
// WAJIB varian `-transparan-`. File `noiseantara-logo-1x1.png` memuat
// `<rect width="1200" height="1200" fill="#121411"/>` yang ikut ter-render,
// sehingga digambar sebagai tile persegi ia memunculkan kotak gelap bertepi
// keras di atas poster. Varian transparan menyisakan sudut kosong, jadi hanya
// artwork logo yang tampil dan tidak ada blok warna yang menutupi layout.
const LOGO_FALLBACK = new URL('./optimized/noiseantara-logo-1x1-transparan-latar-gelap.png', import.meta.url).href;
const logoImage = new Image();
logoImage.src = canvas.dataset.logoSrc || LOGO_FALLBACK;
const logoReady = logoImage.complete
  ? Promise.resolve()
  : new Promise(resolve => { logoImage.onload = resolve; logoImage.onerror = resolve; });

// Dipusatkan di (cx, cy) supaya mudah disejajarkan dengan blok teks di
// sebelahnya; selisih tepi akibat rotasi dihitung pemanggil.
function logoMark(cx, cy, size, rotate = 0) {
  if (!logoImage.complete || !logoImage.naturalWidth) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(rotate);
  ctx.drawImage(logoImage, -size / 2, -size / 2, size, size);
  ctx.restore();
}
const fontMono = '"Space Mono", monospace';
const fontBody = '"DM Sans", Arial, sans-serif';
const safeName = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle('is-error', isError);
}
function setReady(on) {
  ready = on;
  downloadButton.disabled = !on;
  shareButton.disabled = !on;
  canvas.dataset.ready = String(on);
}
function chosenType() { return (liveCollection(typeField.value).length || typeField.value === 'label' || typeField.value === 'pustaka' || collections[typeField.value]) ? typeField.value : 'rilisan'; }
function serverItemFor(type, slug) {
  
  
  const opt = [...entryField.options].find(o => o.value === slug);
  if (!opt) return null;
  const title = opt.textContent.trim() || slug;
  if (type === 'label') return { slug, name: title, title, city: 'jawa-timur', cover: releases[0]?.cover, period: 'KATALOG LABEL', issues: [], releases: [], description: 'Katalog label terverifikasi di arsip Noiseantara.' };
  if (type === 'pustaka') return { slug, title, name: title, city: 'jawa-timur', cover: releases[0]?.cover, summary: 'Cerita arsip terverifikasi di pustaka Noiseantara.', description: 'Cerita arsip terverifikasi di pustaka Noiseantara.' };
  return null;
}
function chosenItem() {
  const type = chosenType();
  const live = liveCollection(type);
  const found = live.find(item => item.slug === entryField.value);
  if (found) return found;
  return serverItemFor(type, entryField.value);
}
const SITE_ROOT = new URL('..', import.meta.url).href; function detailPath(type, item) {
  const map = { rilisan: 'rilisan', gig: 'gig', zine: 'zine', artis: 'artis', label: 'label', pustaka: 'pustaka' };
  return new URL(`${map[type] || 'rilisan'}/${encodeURIComponent(item.slug)}`, SITE_ROOT).href;
}
function itemTitle(type, item) { return (names[type] || (v => v.title || v.name))(item); }
// `artistOf()` hanya tahu fixture statis; entri dari DB tidak ada di sana
// sehingga hasilnya `undefined` — dulu `.name` di sini yang bikin poster gagal.
function artistNameOf(item) {
  if (item.artistName) return item.artistName;
  return artistOf(item)?.name || 'Kompilasi';
}
function itemImage(type, item) {
  if (item.fromDb) return item.cover || placeholderCover;
  if (type === 'label' || type === 'pustaka') return coverPath(item.cover || releases[0].cover);
  return coverPath(type === 'gig' ? item.flyer : item.cover);
}

function populateEntries(type, requestedSlug = '') {
  
  
  const items = liveCollection(type);
  if (!items.length) return false;
  entryField.replaceChildren(...items.map(item => {
    const option = document.createElement('option');
    option.value = item.slug;
    option.textContent = itemTitle(type, item);
    return option;
  }));
  entryField.value = items.some(item => item.slug === requestedSlug) ? requestedSlug : (items[0]?.slug || '');
  return !requestedSlug || entryField.value === requestedSlug;
}
function updateAddress(type, item) {
  history.replaceState(null, '', new URL(`capture?tipe=${encodeURIComponent(type)}&slug=${encodeURIComponent(item.slug)}`, SITE_ROOT).href);
  backHeader.href = detailPath(type, item);
  previewName.textContent = itemTitle(type, item);
  document.title = `Capture ${itemTitle(type, item)} — Noiseantara`;
  canvas.setAttribute('aria-label', `Poster vertikal 9 banding 16 Noiseantara untuk ${labels[type].toLowerCase()} ${itemTitle(type, item)}, arsip terverifikasi`);
}
async function localArtwork(key) {
  if (!imageCache.has(key)) {
    imageCache.set(key, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Ilustrasi tidak tersedia di folder aset lokal.'));
      image.src = key;
    }));
  }
  return imageCache.get(key);
}
const fontsReady = Promise.all([
  document.fonts.load(`900 132px ${fontDisplay}`),
  document.fonts.load(`800 46px ${fontDisplay}`),
  document.fonts.load(`700 24px ${fontMono}`),
  document.fonts.load(`500 30px ${fontBody}`)
]);

function resetCanvas(accent) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, DARK);
  gradient.addColorStop(.7, '#1b261d');
  gradient.addColorStop(1, '#101610');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 10, H);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = .035;
  ctx.lineWidth = 1;
  for (let x = 78; x < W; x += 116) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 84; y < H; y += 116) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.fillRect(78, 198, 924, 2);
}
function line(x1,y1,x2,y2,color='#ffffff29',width=2) {
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function display(text, x, y, size, color = PAPER, weight = 900, align = 'left') {
  ctx.font = `${weight} ${size}px ${fontDisplay}`;
  ctx.fillStyle = color;ctx.textAlign = align;ctx.textBaseline='alphabetic';ctx.fillText(String(text),x,y);
}
function mono(text, x, y, size=20, color=PAPER, align='left') {
  ctx.font=`700 ${size}px ${fontMono}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(text),x,y);
}
function fitLine(text, x, y, maxWidth, size, minSize, family=fontDisplay, weight=800, color=PAPER, align='left') {
  let value=String(text);
  let current=size;
  do {ctx.font=`${weight} ${current}px ${family}`;if(ctx.measureText(value).width<=maxWidth)break;current-=2;} while(current>minSize);
  if(ctx.measureText(value).width>maxWidth){
    while(value.length>2 && ctx.measureText(`${value}…`).width>maxWidth)value=value.slice(0,-1);
    value += '…';
  }
  ctx.textBaseline='alphabetic';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function wordLines(text, maxWidth, size, family=fontDisplay, weight=900) {
  ctx.font=`${weight} ${size}px ${family}`;
  const words=String(text).split(/\s+/).filter(Boolean);
  const lines=[];let current='';
  for(const word of words){
    const next=current?`${current} ${word}`:word;
    if(ctx.measureText(next).width<=maxWidth || !current)current=next;
    else {lines.push(current);current=word;}
  }
  if(current)lines.push(current);
  return lines;
}
function fitMultiline(text, x, topBaseline, maxWidth, maxLines, size, minSize, lineHeight, color=PAPER, family=fontDisplay, weight=900) {
  let fontSize=size,lines=[];
  while(fontSize>=minSize){
    lines=wordLines(text,maxWidth,fontSize,family,weight);
    if(lines.length<=maxLines && lines.every(part=>{ctx.font=`${weight} ${fontSize}px ${family}`;return ctx.measureText(part).width<=maxWidth;}))break;
    fontSize-=3;
  }
  if(fontSize<minSize){fontSize=minSize;lines=wordLines(text,maxWidth,fontSize,family,weight);}
  const shortened=lines.length>maxLines;
  lines=lines.slice(0,maxLines);
  if(shortened)lines[maxLines-1]+='…';
  lines.forEach((part,i)=>fitLine(part,x,topBaseline+i*lineHeight,maxWidth,fontSize,minSize,family,weight,color));
  return topBaseline+(lines.length-1)*lineHeight;
}
function masthead(type, item, accent){
  // Tanpa logo di sini. Artwork logo sudah memuat wordmark "NOISEANTARA"
  // sendiri, jadi ditempel di samping teks yang sama hanya mengulang dua kali
  // — dan pada 56px wordmark di dalam logo jadi gumpalan tak terbaca. Wordmark
  // teks langsung ke margin kiri, satu-satunya branding di kepala kartu.
  // Satu-satunya logo di dalam poster kini stiker di kolom kanan.
  display('NOISE',78,120,47,PAPER,900);
  ctx.font=`900 47px ${fontDisplay}`;
  const noiseWidth=ctx.measureText('NOISE').width;
  display('ANTARA',78+noiseWidth,120,47,accent,900);
  mono('ARSIP MUSIK BAWAH TANAH',79,150,14,'#c5d1bf');
  mono('STORY FILE',1002,112,18,accent,'right');
  mono('1080 × 1920  /  9:16',1002,148,16,'#c4cfbf','right');
  mono(`01 / ${labels[type]} · ARSIP TERVERIFIKASI`,78,245,21,accent);
  const right = type === 'rilisan' ? `${city(item.city).toUpperCase()} / ${item.year}` : type === 'zine' ? `${city(item.city).toUpperCase()} / ZINE` : type === 'gig' ? `${city(item.city).toUpperCase()} / ${item.year}` : type === 'label' ? `KATALOG LABEL / ARSIP` : type === 'pustaka' ? `PUSTAKA / CERITA ARSIP` : `${city(item.city).toUpperCase()}${item.formed ? ' / '+item.formed : ''}`;
  fitLine(right,1002,245,443,21,16,fontMono,700,'#ced9c9','right');
}
function heroTitle(type,item,accent){
  const title=itemTitle(type,item).toUpperCase();
  
  fitMultiline(title,78,348,924,2,132,67,103,PAPER);
  let subtitle='';
  if(type==='rilisan')subtitle=`${artistNameOf(item).toUpperCase()}  /  ${String(item.genre||'ARSIP').toUpperCase()}  /  ${String(item.format||'ARSIP').toUpperCase()}`;
  if(type==='gig')subtitle=`${String(item.date||'ARSIP').toUpperCase()}  /  ${city(item.city).toUpperCase()}  /  ${String(item.precision||'ARSIP').toUpperCase()}`;
  if(type==='zine')subtitle=`${String(item.period||'ARSIP').toUpperCase()}  /  ${city(item.city).toUpperCase()}  /  ${(item.issues||[]).length} ISU TERKATALOG`;
  if(type==='artis')subtitle=`${city(item.city).toUpperCase()}  /  TERBENTUK ${item.formed||'?'}`;
  if(type==='label')subtitle=`KATALOG MANDIRI  /  ARSIP TERVERIFIKASI`;
  if(type==='pustaka')subtitle=`ESAI & CATATAN  /  ARSIP TERVERIFIKASI`;
  line(78,475,1002,475,'#ffffff44',2);
  fitLine(subtitle,78,518,924,24,15,fontMono,700,accent);
}
function drawImageCover(image,x,y,w,h){
  const scale=Math.max(w/image.width,h/image.height);
  const sw=w/scale,sh=h/scale;
  ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,x,y,w,h);
}
function stampedWatermark(cx,cy,size){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.19);
  ctx.font=`900 ${size}px ${fontDisplay}`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=2.3;ctx.strokeStyle='#ffffff99';ctx.globalAlpha=.24;
  ctx.strokeText('NOISEANTARA',0,0);
  ctx.fillStyle='#ffffff';ctx.globalAlpha=.14;ctx.fillText('NOISEANTARA',0,0);
  ctx.restore();
}
function sticker(cx,cy,size=128){
  // Lingkaran "ARSIP / NOISE / ANTARA" diganti tile logo. Ini satu-satunya
  // lambang di dalam poster: masthead dan footer cukup pakai wordmark teks.
  // Ukuran 128 di layout persegi karena kolom kanan hanya selebar 157px
  // (x 844-1001); tile 184px yang lama menabrak bingkai artwork di x<=811.
  logoMark(cx,cy,size,.16);
}
function squareArtwork(image,type,item,accent){
  const x=106,y=554,s=696;
  ctx.fillStyle='#060806';ctx.fillRect(x+24,y+26,s+16,s+16);
  ctx.fillStyle=PAPER;ctx.fillRect(x-9,y-9,s+18,s+18);
  drawImageCover(image,x,y,s,s);
  stampedWatermark(x+s/2,y+s/2,91);
  mono('FIG. 001',845,583,17,accent);
  line(844,602,1001,602,'#ffffff5c');
  display(type==='rilisan'?String(item.year||'—'):String(item.formed || item.year || '—'),841,672,104,PAPER);
  mono(type==='rilisan'?'TAHUN ARSIP':'TERBENTUK',844,709,16,'#c3cfbf');
  line(844,743,1001,743,'#ffffff5c');
  const tag=type==='rilisan'?String(item.format||'ARSIP').toUpperCase():(item.genres?.[0] || 'ARSIP').toUpperCase();
  fitMultiline(tag,844,800,158,3,44,26,41,accent);
  mono(type==='rilisan'?String(item.precision||'ARSIP').toUpperCase():'PROFIL ARSIP',844,934,13,'#c3cfbf');
  line(844,954,1001,954,'#ffffff5c');
  ctx.save();ctx.translate(998,1202);ctx.rotate(-Math.PI/2);
  mono('JEJAK YANG BOLEH DIBAGIKAN',0,0,14,'#c4d0bf');ctx.restore();
  // Dipindah keluar dari artwork ke kolom kanan, di bawah garis terakhir (y954)
  // dan di kiri teks vertikal "JEJAK YANG BOLEH DIBAGIKAN" (x~998).
  sticker(916,1062);
  mono('VISUAL ARSIP  /  SUMBER TERCATAT',106,1277,17,'#c4cfbf');
}
function fact(label,value,x,y,w,accent){
  mono(label,x,y,16,accent);
  
  fitMultiline(String(value).toUpperCase(),x,y+55,w,2,43,26,41,PAPER,fontDisplay,800);
}
function portraitGeneric(image,type,item,accent){
  const x=108,y=566,w=423,h=634;
  ctx.fillStyle='#070a07';ctx.fillRect(x+21,y+22,w+18,h+18);
  ctx.fillStyle=PAPER;ctx.fillRect(x-10,y-10,w+20,h+20);
  drawImageCover(image,x,y,w,h);
  stampedWatermark(x+w/2,y+h/2,62);
  const fx=573,fy=556,fw=429,fh=654;
  ctx.fillStyle=MID;ctx.fillRect(fx,fy,fw,fh);
  ctx.fillStyle=accent;ctx.fillRect(fx,fy,fw,12);
  display(labels[type] || 'ARSIP',fx+26,fy+131,72,accent);
  mono('ENTRI TERVERIFIKASI',fx+28,fy+169,16,PAPER);
  line(fx+28,fy+207,fx+fw-28,fy+207,'#ffffff4a');
  if(type==='label'){
    fact('KATALOG',item.description || 'Katalog rilisan label',fx+28,fy+255,fw-56,accent);
    line(fx+28,fy+390,fx+fw-28,fy+390,'#ffffff40');
    fact('ARSIP','Sumber & tahun tercatat',fx+28,fy+437,fw-56,accent);
  }else{
    fact('CERITA',item.summary || item.description || 'Cerita arsip pustaka',fx+28,fy+255,fw-56,accent);
    line(fx+28,fy+390,fx+fw-28,fy+390,'#ffffff40');
    fact('PUSTAKA','Esai & catatan arsip',fx+28,fy+437,fw-56,accent);
  }
  mono('DOKUMENTASI TERVERIFIKASI',fx+28,fy+fh-27,14,'#d2ddce');
  mono('VISUAL ARSIP  /  SUMBER TERCATAT',108,1265,17,'#c4cfbf');
  // Sejajar kanan dengan baris caption, di bawah artwork (bawahnya y1210) dan
  // di atas panel daftar (y1300). Dipakai layout potret agar tiap tipe kartu
  // punya tepat satu lambang.
  sticker(922,1240,92);
}
function portraitArtwork(image,type,item,accent){
  const x=108,y=566,w=423,h=634;
  ctx.fillStyle='#070a07';ctx.fillRect(x+21,y+22,w+18,h+18);
  ctx.fillStyle=PAPER;ctx.fillRect(x-10,y-10,w+20,h+20);
  drawImageCover(image,x,y,w,h);
  stampedWatermark(x+w/2,y+h/2,62);
  const fx=573,fy=556,fw=429,fh=654;
  ctx.fillStyle=MID;ctx.fillRect(fx,fy,fw,fh);
  ctx.fillStyle=accent;ctx.fillRect(fx,fy,fw,12);
  const number=type==='gig'?String(item.year):String(item.issues.length).padStart(2,'0');
  display(number,fx+26,fy+131,117,accent);
  mono(type==='gig'?'TAHUN ARSIP':'ISU TERDAFTAR',fx+28,fy+169,16,PAPER);
  line(fx+28,fy+207,fx+fw-28,fy+207,'#ffffff4a');
  if(type==='gig'){
    fact('WAKTU',item.date,fx+28,fy+255,fw-56,accent);
    line(fx+28,fy+390,fx+fw-28,fy+390,'#ffffff40');
    fact('TEMPAT',item.venue,fx+28,fy+437,fw-56,accent);
  }else{
    fact('PERIODE',item.period,fx+28,fy+255,fw-56,accent);
    line(fx+28,fy+390,fx+fw-28,fy+390,'#ffffff40');
    fact('KOTA',city(item.city),fx+28,fy+437,fw-56,accent);
  }
  mono('DOKUMENTASI TERVERIFIKASI',fx+28,fy+fh-27,14,'#d2ddce');
  mono(type==='gig'?'FLYER ARSIP  /  DATA TERVERIFIKASI':'SAMPUL ARSIP  /  KATALOG TERPERIKSA',108,1265,17,'#c4cfbf');
  sticker(922,1240,92);
}
function getRows(type,item){
  if(type==='rilisan')return (item.tracks||[]).map((track,i)=>({num:String(i+1).padStart(2,'0'),name:track.title,extra:track.duration||'—'}));
  if(type==='gig')return (item.lineup||[]).map((member,i)=>({num:String(i+1).padStart(2,'0'),name:member.text||(member.artist?(artistBySlug(member.artist)?.name||'Nama belum tercatat'):'Nama belum tercatat'),extra:member.artist?'PENAMPIL':'BELUM PASTI'}));
  if(type==='zine')return (item.issues||[]).map((issue,i)=>({num:String(i+1).padStart(2,'0'),name:`ISU NO. ${issue.number}`,extra:`${issue.year||'?'} / ${issue.pages||'?'} HAL.`}));
  if(type==='label')return [{num:'01',name:(item.description || 'Katalog rilisan label').slice(0,60).toUpperCase(),extra:'KATALOG'}];
  if(type==='pustaka')return [{num:'01',name:(item.summary || item.description || 'Cerita arsip').slice(0,60).toUpperCase(),extra:'CERITA'}];
  const own=(item.releases||[]).slice().sort((a,b)=>(a.year||0)-(b.year||0));
  if(own.length)return own.map((release,i)=>({num:String(i+1).padStart(2,'0'),name:release.title,extra:String(release.year||'?')}));
  return releases.filter(release=>release.artist===item.slug).sort((a,b)=>a.year-b.year).map((release,i)=>({num:String(i+1).padStart(2,'0'),name:release.title,extra:String(release.year)}));
}
function listPanel(type,item,accent){
  
  const x=78,y=1300,w=924,h=416,head=82;
  ctx.fillStyle=PAPER;ctx.fillRect(x,y,w,h);
  ctx.fillStyle=accent;ctx.fillRect(x,y,w,head);
  const label={rilisan:'DAFTAR LAGU',gig:'LINEUP / NAMA',zine:'KATALOG ISU',artis:'DISKOGRAFI',label:'KATALOG',pustaka:'RINGKASAN'}[type];
  display(label,x+27,y+70,58,DARK);
  const rows=getRows(type,item);
  mono(`${String(rows.length).padStart(2,'0')} ${type==='rilisan'?'LAGU':type==='gig'?'NAMA':type==='zine'?'ISU':type==='label'?'KATALOG':type==='pustaka'?'BAGIAN':'RILISAN'}`,x+w-27,y+52,16,DARK,'right');
  mono('DATA ARSIP',x+w-27,y+75,11,'#39452f','right');
  const shown=rows.slice(0,4);
  const rowHeight=shown.length>=4?72:shown.length===3?84:95;
  const start=y+head+10;
  shown.forEach((row,i)=>{
    const yy=start+i*rowHeight;
    if(i>0)line(x+26,yy,x+w-26,yy,'#bfc8b6',1.5);
    mono(row.num,x+27,yy+51,17,'#466b3a');
    fitLine(row.name,x+86,yy+55,580,39,26,fontDisplay,800,DARK);
    fitLine(row.extra,x+w-30,yy+50,193,18,12,fontMono,700,'#4b5e45','right');
  });
  if(rows.length>shown.length){
    mono(`+ ${rows.length-shown.length} LAINNYA  /  BUKA ENTRI`,x+30,y+h-22,15,'#50654b');
  }else if(shown.length===1 && ['artis','zine','rilisan','label','pustaka'].includes(type)){
    line(x+26,y+h-155,x+w-26,y+h-155,'#bfc8b6',1.5);
    const extra=type==='artis'?item.short:type==='zine'?(item.issues||[])[0]?.summary:(item.description || item.summary || 'Buka entri untuk konteks lengkap');
    const note=type==='artis'?'KARAKTER BUNYI / ARSIP':type==='zine'?'ISI ISU / KATALOG':type==='label'?'KATALOG LABEL / ARSIP':type==='pustaka'?'RINGKASAN / ARSIP':'KONTEKS RILISAN / ARSIP';
    mono(note,x+27,y+h-122,15,'#52624e');
    fitMultiline(String(extra||'').toUpperCase(),x+27,y+h-68,834,2,38,27,39,DARK,fontDisplay,800);
  }else if(shown.length<3){
    line(x+26,y+h-69,x+w-26,y+h-69,'#bfc8b6',1.5);
    mono(type==='rilisan'?'RILISAN INI MEMILIKI SATU LAGU YANG TERCATAT':'BUKA ENTRI UNTUK KONTEKS LENGKAP',x+27,y+h-32,16,'#52624e');
  }else if(shown.length===3){
    line(x+26,y+h-50,x+w-26,y+h-50,'#bfc8b6',1.5);
    mono('BUKA ENTRI UNTUK SUMBER & KONTEKS',x+27,y+h-21,15,'#52624e');
  }
}
function footer(type,item,accent){
  ctx.fillStyle='#111810';ctx.fillRect(0,1757,W,163);
  ctx.fillStyle=accent;ctx.fillRect(78,1757,924,3);
  // Footer tidak lagi memakai logo. Di sini sudah ada wordmark "NOISE ANTARA"
  // plus baris "… · NOISEANTARA" di bawahnya, jadi lambang hanya pengulangan.
  // Teks digeser ke margin kiri 78 supaya sejajar dengan elemen lain di poster.
  display('NOISE',78,1824,42,PAPER);
  ctx.font=`900 42px ${fontDisplay}`;
  display('ANTARA',78+ctx.measureText('NOISE').width,1824,42,accent);
  mono('ARSIP MUSIK BAWAH TANAH',78,1850,14,'#c6d1c2');
  fitLine(`/${type}/${item.slug}`,1003,1818,358,16,12,fontMono,700,accent,'right');
  mono('BACA ENTRI ↗',1003,1848,14,'#d0dacc','right');
  line(78,1874,1002,1874,'#ffffff33',1);
  mono('ARSIP TERVERIFIKASI  ·  SUMBER TERCATAT  ·  NOISEANTARA',78,1901,13,'#c9d2c4');
}
function renderPoster(type,item,image){
  const accent=COLORS[ACCENT];
  resetCanvas(accent);
  masthead(type,item,accent);
  heroTitle(type,item,accent);
  if(type==='gig'||type==='zine')portraitArtwork(image,type,item,accent);
  else if(type==='label'||type==='pustaka')portraitGeneric(image,type,item,accent);
  else squareArtwork(image,type,item,accent);
  listPanel(type,item,accent);
  footer(type,item,accent);
}
async function refresh({ updateURL=true }={}) {
  const type=chosenType(),item=chosenItem();
  if(!item){setReady(false);setStatus('Pilih satu entri yang tersedia.',true);return;}
  const id=++requestId;setReady(false);pngBlob=null;activeItem=item;
  if(updateURL)updateAddress(type,item);
  setStatus('Menyusun poster dari font dan ilustrasi lokal…');
  try{
    const [image]=await Promise.all([localArtwork(itemImage(type,item)),fontsReady,logoReady]);
    if(id!==requestId)return;
    renderPoster(type,item,image);
    setReady(true);
    setStatus('Pratinjau siap. Unduh PNG, lalu unggah melalui aplikasi pilihanmu.');
  }catch(error){
    if(id!==requestId)return;
    console.error('Gagal membuat poster:',error);
    setStatus('Gagal memuat artwork atau font lokal. Jalankan melalui server lokal dan periksa folder assets/.',true);
    setReady(false);
  }
}
function changeType(type, slug){
  typeField.value=(liveCollection(type).length || type === 'label' || type === 'pustaka')?type:'rilisan';
  const found=populateEntries(chosenType(),slug);
  refresh().then(()=>{
    if(!found)setStatus('Entri pada tautan tidak ditemukan; menampilkan entri pertama. Pilih entri lain jika perlu.',true);
  });
}
function toPngBlob(){
  if(!ready)return Promise.reject(new Error('Pratinjau belum siap.'));
  if(pngBlob)return Promise.resolve(pngBlob);
  return new Promise((resolve,reject)=>{
    try {canvas.toBlob(blob=>{if(!blob)reject(new Error('Gambar tidak dapat diekspor.'));else{pngBlob=blob;resolve(blob);}},'image/png');}
    catch(error){reject(error);}
  });
}
function fileName(){return `noiseantara-${chosenType()}-${safeName(activeItem?.slug||'arsip')}-story-1080x1920.png`;}
function downloadBlob(blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=fileName();document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
  setStatus('PNG tersimpan. Pilih gambar tersebut dari galeri saat membuat Story atau TikTok Photo.');
}


ctx.fillStyle=DARK;ctx.fillRect(0,0,W,H);
ctx.fillStyle=COLORS.lime;ctx.fillRect(0,0,10,H);
mono('NOISEANTARA / CAPTURE STUDIO',80,130,28,COLORS.lime);
display('MENYUSUN',80,690,147,PAPER);
display('JEJAKNYA.',80,830,147,COLORS.lime);
mono('MENGAMBIL GAMBAR & FONT LOKAL…',80,950,22,PAPER);

const query=new URLSearchParams(location.search);
changeType(query.get('tipe')||'rilisan',query.get('slug')||'');
typeField.addEventListener('change',()=>changeType(typeField.value));
entryField.addEventListener('change',()=>refresh());
document.getElementById('safeButton').addEventListener('click',event=>{
  const button=event.currentTarget;
  const visible=document.getElementById('captureFrame').classList.toggle('show-safe');
  button.setAttribute('aria-pressed',String(visible));
  button.firstChild.textContent=visible?'SEMBUNYIKAN AREA AMAN ':'LIHAT AREA AMAN ';
});
downloadButton.addEventListener('click',async()=>{
  try{downloadButton.disabled=true;setStatus('Menyiapkan berkas PNG resolusi penuh…');const blob=await toPngBlob();downloadBlob(blob);}
  catch(error){console.error(error);setStatus('PNG gagal dibuat. Pastikan aset gambar berada pada server yang sama.',true);}
  finally{downloadButton.disabled=!ready;}
});
shareButton.addEventListener('click',async()=>{
  try{
    shareButton.disabled=true;
    const blob=await toPngBlob();
    const file=new File([blob],fileName(),{type:'image/png'});
    if(navigator.share && navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:`Noiseantara / ${itemTitle(chosenType(),activeItem)}`});
      setStatus('Berkas gambar dibagikan melalui menu perangkat.');
    }else{
      downloadBlob(blob);
      setStatus('Berbagi berkas tidak tersedia di browser ini. PNG diunduh untuk diunggah manual.');
    }
  }catch(error){
    if(error?.name!=='AbortError'){console.error(error);setStatus('Tidak dapat membuka menu berbagi. Coba Unduh PNG.',true);}
  }finally{shareButton.disabled=!ready;}
});
