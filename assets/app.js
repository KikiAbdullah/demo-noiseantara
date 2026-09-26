import {
  cities, labels, artists, releases, articles,
  cityBySlug, artistBySlug, releaseBySlug, labelBySlug, articleBySlug,
  artistOf, labelOf, coverPath
} from './data.js';
import { gigs, zines, needs, gigBySlug, zineBySlug, issueBySlug } from './extended-data.js';
import { createExtraPages } from './extra-pages.js';

const app = document.querySelector('#app');
const DRAFT_KEY = 'noiseantara:release-draft:v1';
const SAVED_KEY = 'noiseantara:saved-releases:v1';
const FORMATS = ['Kaset', 'CD-R', 'CD', 'Vinyl', 'Digital'];
const GENRES = ['Hardcore', 'Punk', 'Noise', 'Metal', 'Sludge', 'Grindcore', 'Indie / DIY', 'Eksperimental'];
const TYPES = ['Demo', 'EP', 'Album', 'Split', 'Single', 'Live'];
const svgPaths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowUp: '<path d="M6 18 18 6M8 6h10v10"/>',
  arrowDown: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  close: '<path d="M5 5 19 19M19 5 5 19"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h18"/>',
  bookmark: '<path d="M5 4.5h14v16l-7-4.7-7 4.7z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M14.5 6.5A6 6 0 0 1 18 10"/>',
  filter: '<path d="M3 5h18M6 12h12M9 19h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 3-4 5 6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 14v5h4v-6H3Zm14-1v6h4v-5h-4Z"/>',
  book: '<path d="M12 6C9 4 5 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1Zm0 0v15"/>',
  alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
  external: '<path d="M13 4h7v7M20 4l-9 9M18 14v6H4V6h6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
  refresh: '<path d="M20 9a8 8 0 0 0-14-3L4 8m0-4v4h4M4 15a8 8 0 0 0 14 3l2-2m0 4v-4h-4"/>',
  quote: '<path d="M10 6H5l-2 5v7h8v-8H6m15-4h-5l-2 5v7h8v-8h-5"/>',
  headphonesOff: '<path d="M3 3 21 21M3 14v-3a9 9 0 0 1 15-6m3 9v-3c0-1-.2-2-.5-3M3 14v5h4v-5H3Zm14 2v3h4v-5h-4"/>'
};
function icon(name, size = 20, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" class="icon ${extra}" aria-hidden="true">${svgPaths[name] || svgPaths.arrow}</svg>`;
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const enc = value => encodeURIComponent(value);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = value => normalize(value).replace(/\s+/g, '-');
const cityName = slug => cityBySlug(slug)?.name || 'Belum diketahui';
// A real HTML page renders the 9:16 poster; don't route it through the SPA.
function captureLink(type, slug) {
  const label = { rilisan: 'rilisan', gig: 'gig', zine: 'zine', artis: 'artis' }[type] || 'entri';
  return `<a class="btn-capture" href="/capture.html?tipe=${enc(type)}&slug=${enc(slug)}" data-native-nav aria-label="Capture ${esc(label)} ke PNG vertikal 9 banding 16">${icon('image', 18)} <span>CAPTURE <b>9:16</b></span></a>`;
}

const saved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]').filter(slug => !!releaseBySlug(slug)); } catch { return []; } };
const isSaved = slug => saved().includes(slug);
const cityReleaseCount = slug => releases.filter(release => release.city === slug).length;
const cityArtistCount = slug => artists.filter(artist => artist.city === slug).length;
const imageTag = (key, alt, className = '', eager = false) => `<img src="${coverPath(key, true)}" srcset="${coverPath(key, true)} 500w, ${coverPath(key)} 1000w" sizes="(max-width: 600px) 90vw, 34vw" width="500" height="500" alt="${esc(alt)}" class="${className}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
const eyebrow = (num, label, light = false) => `<p class="eyebrow ${light ? 'eyebrow--light' : ''}"><span class="eyebrow-index">${esc(num)}</span><span class="eyebrow-line"></span>${esc(label)}</p>`;
function brand(footer = false) {
  return `<a href="/" class="brand ${footer ? 'brand--footer' : ''}" aria-label="Noiseantara — beranda"><span class="brand-symbol" aria-hidden="true"><svg viewBox="0 0 52 52" fill="none"><path d="M6 39V14L17 39V14L28 39V14L39 39V14l7 25" stroke="currentColor" stroke-width="5.8" stroke-linecap="square"/></svg></span><span class="brand-type"><strong>NOISE<span>ANTARA</span></strong><small>ARSIP MUSIK BAWAH TANAH</small></span></a>`;
}
function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Beranda</a>${items.map((item, i) => `<span class="crumb-sep">/</span>${i === items.length - 1 ? `<span aria-current="page">${esc(item.label)}</span>` : `<a href="${item.href}">${esc(item.label)}</a>`}`).join('')}</nav>`;
}
function demoNote(variant = '') {
  return `<div class="demo-note ${variant}">${icon('info', 16)} <span><strong>Ini prototipe.</strong> Seluruh nama, rilisan, artwork, angka, dan sumber entri di sini adalah ilustrasi; bukan catatan sejarah terverifikasi.</span></div>`;
}
function releaseCard(release, options = {}) {
  const artist = artistOf(release);
  const index = String(releases.indexOf(release) + 1).padStart(3, '0');
  return `<article class="release-card ${options.dark ? 'release-card--dark' : ''}" data-card="${esc(release.slug)}">
    <div class="release-art-wrap">
      <a href="/rilisan/${enc(release.slug)}" class="release-art" aria-label="Lihat rincian ${esc(release.title)}">${imageTag(release.cover, `Artwork ilustratif rilisan contoh ${release.title}`)}<span class="art-corner">N° ${index}</span><span class="art-overlay"><span>LIHAT ENTRI ${icon('arrowUp', 18)}</span></span></a>
      <button class="card-save ${isSaved(release.slug) ? 'is-saved' : ''}" type="button" data-action="bookmark" data-slug="${esc(release.slug)}" aria-label="${isSaved(release.slug) ? 'Hapus dari' : 'Simpan ke'} daftar bacaan: ${esc(release.title)}" aria-pressed="${isSaved(release.slug)}" title="Simpan untuk nanti">${icon('bookmark', 17)}</button>
    </div>
    <div class="release-card-meta"><span>${esc(release.type)} <span class="meta-dot">·</span> ${esc(release.format)}</span><span>${release.year}</span></div>
    <h3 class="release-card-title"><a href="/rilisan/${enc(release.slug)}">${esc(release.title)}</a></h3>
    <p class="release-card-artist"><a href="/artis/${enc(artist.slug)}">${esc(artist.name)}</a> <span>— ${esc(cityName(release.city))}</span></p>
  </article>`;
}
function artistCard(artist) {
  const discography = releases.filter(release => release.artist === artist.slug);
  return `<article class="artist-card"><a href="/artis/${enc(artist.slug)}" class="artist-card-link">
    <div class="artist-card-image">${imageTag(artist.cover, `Artwork ilustratif profil ${artist.name}`)}<span class="artist-card-number">${String(artists.indexOf(artist) + 1).padStart(2, '0')} / ${String(artists.length).padStart(2, '0')}</span></div>
    <div class="artist-card-bottom"><div><p class="mono-label">${esc(cityName(artist.city))} <span class="meta-dot">/</span> ${esc(artist.genres[0])}</p><h3>${esc(artist.name)}</h3><p>${esc(artist.short)}</p></div><span class="artist-card-arrow">${icon('arrowUp', 22)}</span></div>
    <span class="artist-card-count">${discography.length} RILISAN DALAM DEMO</span>
  </a></article>`;
}
function articleCard(article, index) {
  const cover = article.image === 'scene-live' ? '/assets-public/optimized/scene-live-sm.webp' : coverPath(article.image, true);
  return `<article class="article-card"><a href="/pustaka/${enc(article.slug)}" class="article-card-link"><div class="article-card-photo"><img src="${cover}" alt="Ilustrasi editorial untuk ${esc(article.title)}" width="720" height="480" loading="lazy"><span class="article-card-no">0${index + 1}</span></div><div class="article-card-info"><p class="mono-label">${esc(article.kicker)} <span class="meta-dot">·</span> ${article.minutes} MENIT BACA</p><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><span class="text-link">BACA CERITA ${icon('arrowUp', 17)}</span></div></a></article>`;
}
function pageIntro(numberTag, kicker, title, description, options = {}) {
  return `<section class="page-intro ${options.dark ? 'page-intro--dark' : ''}"><div class="site-container">${eyebrow(numberTag, kicker, options.dark)}<div class="page-intro-inner"><div><h1 class="page-display">${title}</h1><p class="page-intro-copy">${description}</p></div>${options.aside || ''}</div></div></section>`;
}
function emptyState(title, copy, href = '/kontribusi', label = 'BANTU LENGKAPI ARSIP') {
  return `<div class="empty-state"><span class="empty-state-mark">${icon('disc', 48)}</span><p class="mono-label">BELUM DITEMUKAN / 404 BUKAN AKHIR</p><h3>${esc(title)}</h3><p>${esc(copy)}</p><div class="empty-actions"><a href="${href}" class="btn-ink">${esc(label)} ${icon('arrowUp', 18)}</a><a href="/rilisan" class="btn-text">Lihat semua rilisan ${icon('arrow', 18)}</a></div></div>`;
}

function header(active) {
  const navs = [ ['rilisan', 'Rilisan', '/rilisan'], ['artis', 'Artis', '/artis'], ['gig', 'Gig', '/gig'], ['zine', 'Zine', '/zine'], ['label', 'Label', '/label'], ['scene', 'Scene', '/scene'], ['pustaka', 'Pustaka', '/pustaka'] ];
  return `<div class="top-strip"><div class="site-container top-strip-inner"><span><span class="top-pulse"></span> PROTOTIPE PUBLIK <span class="top-divider">/</span> DATA ILUSTRATIF</span><span class="top-strip-right">DARI JAWA TIMUR, UNTUK INGATAN BERSAMA <span>↗</span></span></div></div>
  <header class="site-header"><div class="site-container header-inner">
    ${brand()}
    <nav class="desktop-nav" aria-label="Navigasi utama">${navs.map(([key, label, href]) => `<a href="${href}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <div class="header-actions"><button type="button" class="header-search" data-bs-toggle="modal" data-bs-target="#searchModal" aria-label="Buka pencarian arsip, pintasan Control K">${icon('search', 20)}<span>CARI</span><kbd>⌘ K</kbd></button><a href="/tersimpan" class="header-saved" aria-label="Lihat daftar tersimpan">${icon('bookmark', 19)}<span class="saved-count" data-saved-count>${saved().length}</span></a><a href="/kontribusi" class="header-contribute">IKUT ARSIPKAN ${icon('arrowUp', 16)}</a><button class="header-mobile-menu" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobileNav" aria-controls="mobileNav" aria-label="Buka menu">${icon('menu', 25)}</button></div>
  </div></header>`;
}
function footer() {
  return `<footer class="footer"><div class="site-container"><div class="footer-top"><div class="footer-mission">${brand(true)}<p>Bunyi boleh berlalu.<br>Jejaknya jangan.</p><span class="footer-demo">PROTOTIPE • KONTEN DEMONSTRASI • 2026</span></div><div class="footer-links"><div><span>JELAJAHI</span><a href="/jelajah">Semua jalur</a><a href="/rilisan">Rilisan</a><a href="/artis">Artis</a><a href="/gig">Gig & flyer</a><a href="/zine">Zine</a><a href="/label">Label</a><a href="/scene">Scene per kota</a><a href="/pustaka">Pustaka</a></div><div><span>IKUT TERLIBAT</span><a href="/kontribusi">Kontribusi</a><a href="/dibutuhkan">Yang dibutuhkan</a><a href="/linimasa">Linimasa</a><a href="/statistik">Statistik demo</a><a href="/genre">Indeks genre</a><a href="/kontribusi/panduan">Panduan arsip</a><a href="/tersimpan">Tersimpan lokal</a><a href="/tentang">Tentang kami</a><a href="/tentang/kredit">Kredit</a></div><div><span>HAL PENTING</span><a href="/kebijakan">Kebijakan konten</a><a href="/privasi">Privasi</a><a href="/ketentuan">Ketentuan</a><a href="/aksesibilitas">Aksesibilitas</a><a href="/donasi">Dukung arsip</a></div></div></div><div class="footer-giant" aria-hidden="true">NOISEANTARA<span>✳</span></div><div class="footer-bottom"><p>© 2026 NOISEANTARA. DIBANGUN AGAR SEJARAH TIDAK HILANG.</p><p>INDEPENDEN <span class="footer-cross">✳</span> BERSUMBER <span class="footer-cross">✳</span> UNTUK SEMUA</p><a href="#top" data-action="back-to-top">KEMBALI KE ATAS ↑</a></div></div></footer>`;
}
function modals() {
  return `<div class="offcanvas offcanvas-end mobile-canvas" tabindex="-1" id="mobileNav" aria-labelledby="mobileNavTitle"><div class="offcanvas-header"><span id="mobileNavTitle" class="mono-label">NOISEANTARA / MENU</span><button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Tutup menu"></button></div><div class="offcanvas-body"><nav aria-label="Menu seluler"><a href="/">Beranda <span>00</span></a><a href="/jelajah">Jelajahi semuanya <span>↗</span></a><a href="/rilisan">Rilisan <span>01</span></a><a href="/artis">Artis <span>02</span></a><a href="/gig">Gig & flyer <span>03</span></a><a href="/zine">Zine <span>04</span></a><a href="/label">Label <span>05</span></a><a href="/scene">Scene <span>06</span></a><a href="/pustaka">Pustaka <span>07</span></a><a href="/linimasa">Linimasa <span>↗</span></a><a href="/dibutuhkan">Yang dibutuhkan <span>↗</span></a><a href="/statistik">Statistik demo <span>↗</span></a><a href="/tersimpan">Tersimpan <span>↗</span></a></nav><a href="/kontribusi" class="btn-acid mobile-canvas-cta">IKUT ARSIPKAN ${icon('arrowUp', 19)}</a><p>Arsip terbuka, dibangun orang per orang.</p></div></div>
  <div class="modal fade search-modal" id="searchModal" tabindex="-1" aria-labelledby="searchModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><span id="searchModalTitle" class="mono-label">CARI DI SELURUH ARSIP</span><button type="button" class="modal-x" data-bs-dismiss="modal" aria-label="Tutup pencarian">${icon('close', 22)}</button></div><div class="search-field-modal">${icon('search', 25)}<input id="siteSearchInput" type="search" autocomplete="off" placeholder="Cari band, gig, zine..." aria-label="Kata kunci pencarian" aria-controls="searchResults" aria-autocomplete="list" aria-expanded="false" role="combobox"><kbd>ESC</kbd></div><div id="searchResults" class="search-results" role="listbox" aria-label="Saran pencarian"><div class="search-hint">Coba cari <button type="button" data-action="search-example" data-query="Rongga">Rongga</button>, <button type="button" data-action="search-example" data-query="tipe:gig">tipe:gig</button>, atau <button type="button" data-action="search-example" data-query="kota:Malang">kota:Malang</button>.</div></div><div class="search-modal-bottom"><span>↑ ↓ PILIH <span class="meta-dot">·</span> ENTER BUKA <span class="meta-dot">·</span> ESC TUTUP</span><a href="/cari" id="searchAllLink">LIHAT SEMUA HASIL ${icon('arrow', 15)}</a></div></div></div></div>
  <div class="modal fade utility-modal" id="citationModal" tabindex="-1" aria-labelledby="citationModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><span class="mono-label">ALAT ARSIP / SITASI</span><button type="button" class="modal-x" data-bs-dismiss="modal" aria-label="Tutup">${icon('close', 22)}</button></div><div class="modal-body"><h2 id="citationModalTitle">Kutip arsip ini.</h2><p class="utility-disclaimer">Contoh sitasi untuk data demonstrasi. Jangan gunakan sebagai rujukan sejarah nyata.</p><div class="citation-tabs" role="group" aria-label="Format sitasi"><button type="button" class="active" data-citation-format="apa">APA</button><button type="button" data-citation-format="mla">MLA</button><button type="button" data-citation-format="footnote">CATATAN KAKI</button><button type="button" data-citation-format="bibtex">BIBTEX</button></div><pre id="citationText" class="citation-output" tabindex="0"></pre><button class="btn-acid w-100 justify-content-center" type="button" data-action="copy-citation">${icon('copy', 18)} SALIN SITASI</button></div></div></div></div>
  <div class="modal fade utility-modal" id="coverModal" tabindex="-1" aria-labelledby="coverModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><span id="coverModalTitle" class="mono-label">ILUSTRASI / ARTEFAK CONTOH</span><button type="button" class="modal-x" data-bs-dismiss="modal" aria-label="Tutup gambar">${icon('close', 22)}</button></div><div class="modal-body cover-modal-body"><img id="coverModalImage" src="" alt="" width="900" height="900"><p id="coverModalCaption">Artwork ilustratif. Bukan scan rilisan asli.</p></div></div></div></div>
  <div class="modal fade utility-modal" id="reportModal" tabindex="-1" aria-labelledby="reportModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><span class="mono-label">ARSIP YANG BISA DIKOREKSI</span><button type="button" class="modal-x" data-bs-dismiss="modal" aria-label="Tutup">${icon('close', 22)}</button></div><div class="modal-body"><h2 id="reportModalTitle">Laporkan masalah.</h2><p class="utility-disclaimer">Prototipe tanpa server: laporan <strong>tidak dikirim</strong>. Kamu bisa menyalin ringkasannya untuk disimpan.</p><p class="report-url" id="reportUrl"></p><label class="field-label" for="reportReason">APA YANG PERLU DITINJAU?</label><select id="reportReason" class="form-select form-control-n"><option value="Data tidak akurat">Data tidak akurat</option><option value="Hak cipta / media">Hak cipta / media</option><option value="Privasi / hak potret">Privasi / hak potret</option><option value="Lainnya">Lainnya</option></select><label class="field-label mt-3" for="reportDetail">KETERANGAN (OPSIONAL)</label><textarea id="reportDetail" class="form-control form-control-n" rows="4" placeholder="Ceritakan yang kamu temukan..."></textarea><button type="button" class="btn-acid w-100 justify-content-center mt-4" data-action="copy-report">${icon('copy', 18)} SALIN RINGKASAN LAPORAN</button></div></div></div></div>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:1080"><div id="siteToast" class="toast site-toast" role="status" aria-live="polite" aria-atomic="true"><div class="toast-body"><span id="siteToastText"></span><button class="toast-close" type="button" data-bs-dismiss="toast" aria-label="Tutup">${icon('close', 16)}</button></div></div></div>`;
}
function shell(body, active = '') {
  return `<div id="top"></div>${header(active)}<main id="main-content" tabindex="-1">${body}</main>${footer()}${modals()}<div class="reading-progress" id="readingProgress" aria-hidden="true"></div><button class="back-top" type="button" data-action="back-to-top" aria-label="Kembali ke atas">↑</button>`;
}

function homePage() {
  const featured = releases.filter(release => release.featured).slice(0, 4);
  const article = articles[0];
  return `<section class="hero"><div class="hero-grid" aria-hidden="true"></div><div class="site-container hero-inner"><div class="hero-copy">${eyebrow('01 / 06', 'SEBUAH ARSIP UNTUK YANG TERLUPAKAN', true)}<h1>YANG BISING<br>TAK BOLEH<br><span>HILANG<span class="hero-dot">.</span></span></h1><p class="hero-description">Kaset yang berpindah tangan. Gig yang tinggal di ingatan. Nama-nama yang nyaris tak tercatat. <strong>Di sini, jejaknya kita jaga bersama.</strong></p><form class="hero-search" action="/cari" method="get" role="search">${icon('search', 22)}<input type="search" name="q" placeholder="Cari band atau rilisan..." aria-label="Cari di arsip"><button type="submit" aria-label="Cari">${icon('arrow', 21)}</button></form><div class="hero-links"><a href="/rilisan" class="btn-acid">JELAJAHI ARSIP ${icon('arrowUp', 19)}</a><a href="/tentang" class="btn-underlined">KENALI NOISEANTARA ${icon('arrow', 19)}</a></div><div class="hero-proof"><span class="hero-proof-line"></span><span>BUKAN STREAMING. INI INGATAN KOLEKTIF.</span></div></div>
  <div class="hero-visual" aria-label="Kolase artwork ilustratif rilisan underground"><div class="hero-orbit" aria-hidden="true"></div><div class="hero-vinyl" aria-hidden="true"><span></span></div><div class="hero-back-cover" aria-hidden="true"><img src="${coverPath('kamar-ambang', true)}" alt=""></div><div class="hero-main-sleeve"><div class="sleeve-top"><span>NOISEANTARA<br>ARCHIVE COPY</span><span>001 / 026</span></div><img src="${coverPath('rongga-trotoar')}" alt="Artwork ilustratif kaset fiktif Bising di Bawah Tanah" width="500" height="500" fetchpriority="high"><div class="sleeve-bottom"><span>RONGGA TROTOAR<br><strong>BISING DI BAWAH TANAH</strong></span><span>2003<br>DEMO / KASET</span></div></div><div class="hero-stamp"><span>SIMPAN</span><strong>JEJAK<br>NYA.</strong><span>✳ NOISEANTARA ✳</span></div><div class="hero-art-label">FIG. 01 <span>—</span> ARTEFAK ILUSTRATIF</div></div></div><div class="hero-bottom"><div class="site-container hero-bottom-inner"><div><span>12</span><p>RILISAN<br>CONTOH</p></div><div><span>09</span><p>ARTIS<br>CONTOH</p></div><div><span>07</span><p>KOTA<br>DI JAWA TIMUR</p></div><p class="hero-scroll">GULIR UNTUK<br>MENJELAJAHI <span>↓</span></p></div></div></section>
  <div class="ticker" aria-hidden="true"><div class="ticker-track">${Array(3).fill('PUNK <span>✳</span> HARDCORE <span>✳</span> METAL <span>✳</span> NOISE <span>✳</span> INDIE / DIY <span>✳</span> ARSIP UNTUK SEMUA <span>✳</span>').join(' ')}</div></div>
  <section class="featured-section section-cream"><div class="site-container">${eyebrow('02 / 06', 'BARU DARI RAK ARSIP')}<div class="section-heading"><div><h2>SUARA YANG<br><em>DITEMUKAN.</em></h2><p>Setiap rilisan adalah pintu masuk ke orang, tempat, dan waktu di belakangnya.</p></div><a href="/rilisan" class="section-side-link">SEMUA RILISAN <span>${icon('arrowUp', 19)}</span></a></div><div class="featured-grid">${featured.map(release => releaseCard(release)).join('')}</div><div class="section-footnote"><span>01—04 / 12 ENTRI ILUSTRATIF</span><span>URUTAN KURASI MANUSIA, BUKAN ALGORITMA.</span></div></div></section>
  <section class="manifesto-section"><div class="site-container manifesto-grid"><div class="manifesto-image"><img src="/assets-public/optimized/scene-live.webp" alt="Ilustrasi suasana pertunjukan kecil underground, dibuat untuk prototipe" width="1400" height="933" loading="lazy"><span class="image-edge-note">DOKUMENTASI VISUAL ILUSTRATIF / BUKAN FOTO PERISTIWA NYATA</span><span class="manifesto-overlay">BUKAN SEKADAR<br><em>DISKOGRAFI.</em></span></div><div class="manifesto-copy">${eyebrow('TENTANG ARSIP', 'KENAPA INI PENTING', true)}<div class="asterisk" aria-hidden="true">✳</div><h2>YANG HILANG BUKAN CUMA <span>SUARANYA.</span></h2><p>Sebuah sampul kaset menyimpan lebih dari daftar lagu. Ada tahun yang samar, kota yang membentuknya, dan orang-orang yang menjaga salinannya tetap hidup.</p><p>Noiseantara dibangun untuk merangkai potongan itu—<strong>dengan sumber, dengan kredit, dan tanpa mengarang bagian yang belum kita tahu.</strong></p><a href="/tentang" class="text-link light">CARA KAMI BEKERJA ${icon('arrowUp', 18)}</a></div></div></section>
  <section class="scene-section section-acid"><div class="site-container">${eyebrow('03 / 06', 'SATU SCENE, BANYAK KOTA')}<div class="scene-heading"><h2>BERMULA<br>DARI <span>JATIM.</span></h2><p>Setiap kota punya frekuensinya sendiri. Pilih satu, lalu ikuti jejak rilisan dan nama-nama di sekitarnya.</p></div><div class="scene-explorer"><div class="scene-city-list" role="group" aria-label="Pilih kota untuk melihat cuplikan">${cities.slice(0, 5).map((city, i) => `<button type="button" class="city-select ${i === 0 ? 'active' : ''}" data-action="city-preview" data-city="${city.slug}" aria-pressed="${i === 0}"><span class="city-list-number">${city.number}</span><span>${esc(city.name)}</span>${icon('arrowUp', 19)}</button>`).join('')}<a href="/scene" class="city-all-link">LIHAT SEMUA KOTA ${icon('arrow', 17)}</a></div><div class="scene-preview" id="scenePreview" style="--city-accent:${cities[0].color}">${scenePreview(cities[0])}</div></div></div></section>
  ${homeEphemera()}
  <section class="editorial-section section-cream"><div class="site-container">${eyebrow('05 / 06', 'CERITA DI BALIK SUARA')}<div class="section-heading"><div><h2>BUKAN CUMA<br><em>DATA.</em></h2><p>Catatan, pertanyaan, dan kisah di balik arsip yang terus tumbuh.</p></div><a href="/pustaka" class="section-side-link">KE PUSTAKA <span>${icon('arrowUp', 19)}</span></a></div><div class="editorial-grid"><a href="/pustaka/${article.slug}" class="editorial-main"><img src="/assets-public/optimized/scene-live.webp" alt="Ilustrasi editorial pertunjukan musik kecil" width="1400" height="933" loading="lazy"><div class="editorial-main-overlay"><span>01 / ${esc(article.kicker)}</span><h3>${esc(article.title)}</h3><span class="text-link light">BACA CERITA ${icon('arrowUp', 19)}</span></div></a><div class="editorial-side">${articles.slice(1, 3).map((item, i) => `<a href="/pustaka/${item.slug}" class="editorial-side-item"><span>0${i + 2} / ${esc(item.kicker)}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><span class="round-arrow">${icon('arrowUp', 19)}</span></a>`).join('')}</div></div></div></section>
  ${homeDirectory()}
  <section class="contribute-cta"><div class="site-container contribute-cta-inner"><span class="cta-asterisk" aria-hidden="true">✳</span><div><p class="mono-label">ARSIP INI TAK DIBANGUN SENDIRIAN</p><h2>PUNYA KASETNYA?<br><span>JANGAN SIMPAN CERITANYA SENDIRI.</span></h2><p>Satu foto sampul, satu nama, satu ingatan—semuanya bisa jadi awal.</p></div><a href="/kontribusi" class="cta-circle" aria-label="Mulai berkontribusi">${icon('arrowUp', 35)}<span>IKUT<br>ARSIPKAN</span></a></div></section>`;
}
function homeEphemera() {
  const gig = gigs[0], zine = zines[0];
  return `<section class="home-ephemera"><div class="site-container">${eyebrow('04 / 06', 'LEBIH DARI DISKOGRAFI', true)}<div class="home-ephemera-head"><h2>YANG TERCETAK.<br><em>YANG TERJADI.</em></h2><p>Di luar rak rilisan, jejak scene hadir di poster yang robek dan halaman yang berpindah tangan.</p></div><div class="home-ephemera-grid"><a href="/gig/${enc(gig.slug)}" class="home-feature home-feature--gig"><div class="home-feature-media">${imageTag(gig.flyer, `Flyer ilustratif ${gig.title}`)}<span class="feature-sticker">01 / PANGGUNG</span></div><div class="home-feature-copy"><span class="mono-label">GIG / ${esc(cityName(gig.city).toUpperCase())} / ${gig.year}</span><h3>${esc(gig.title)}</h3><p>Poster, lineup, dan catatan yang belum sepenuhnya diketahui.</p><span>JELAJAHI GIG ${icon('arrowUp', 20)}</span></div></a><a href="/zine/${enc(zine.slug)}" class="home-feature home-feature--zine"><div class="home-feature-media">${imageTag(zine.cover, `Sampul ilustratif zine ${zine.name}`)}<span class="feature-sticker">02 / CETAK</span></div><div class="home-feature-copy"><span class="mono-label">ZINE / ${esc(cityName(zine.city).toUpperCase())} / ${esc(zine.period)}</span><h3>${esc(zine.name)}</h3><p>Halaman fotokopi yang membuka jalan ke cerita lain.</p><span>JELAJAHI ZINE ${icon('arrowUp', 20)}</span></div></a></div><div class="home-ephemera-footer"><span>SELURUH FLYER, SAMPUL & ACARA DI SINI ADALAH ILUSTRASI FIKTIF.</span><div><a href="/gig">SEMUA GIG ↗</a><a href="/zine">SEMUA ZINE ↗</a></div></div></div></section>`;
}
function homeDirectory() {
  const paths = [['01','RILISAN',releases.length,'/rilisan'],['02','ARTIS',artists.length,'/artis'],['03','GIG',gigs.length,'/gig'],['04','ZINE',zines.length,'/zine'],['05','KOTA',cities.length,'/scene'],['06','PUSTAKA',articles.length,'/pustaka']];
  return `<section class="home-directory section-cream"><div class="site-container">${eyebrow('06 / 06', 'PILIH JALANMU SENDIRI')}<div class="home-directory-top"><h2>ARSIP INI PUNYA<br><em>BANYAK PINTU.</em></h2><a href="/jelajah" class="section-side-link">BUKA PETA ARSIP <span>${icon('arrowUp',18)}</span></a></div><div class="home-directory-grid">${paths.map(([no,label,count,path])=>`<a href="${path}"><span>${no} / ${String(count).padStart(2,'0')} ENTRI DEMO</span><strong>${label}</strong>${icon('arrowUp',25)}</a>`).join('')}</div><div class="home-directory-under"><a href="/linimasa">LINIMASA ${icon('arrow',16)}</a><a href="/genre">INDEKS GENRE ${icon('arrow',16)}</a><a href="/statistik">STATISTIK DEMO ${icon('arrow',16)}</a><a href="/dibutuhkan">YANG BELUM KITA TAHU ${icon('arrow',16)}</a></div></div></section>`;
}
function scenePreview(city) {
  return `<span class="scene-preview-sun" aria-hidden="true"></span><div class="scene-preview-top"><span>SCENE FILE / ${esc(city.code)}</span><span>JAWA TIMUR, INDONESIA</span></div><strong class="scene-preview-name">${esc(city.name.toUpperCase())}<span>.</span></strong><div class="scene-preview-footer"><div><span>0${cityReleaseCount(city.slug)} RILISAN CONTOH</span><span>0${cityArtistCount(city.slug)} ARTIS CONTOH</span></div><div><p>${esc(city.mood)}</p><a href="/scene/${enc(city.slug)}">JELAJAHI SCENE ${icon('arrowUp', 19)}</a></div></div>`;
}

function releaseFilters() {
  const p = new URLSearchParams(location.search);
  return { q: p.get('q') || '', genre: p.get('genre') || '', city: p.get('kota') || '', decade: p.get('dekade') || '', type: p.get('jenis') || '', format: p.get('format') || '', sort: p.get('urut') || 'terbaru', page: Math.max(1, parseInt(p.get('halaman') || '1', 10) || 1), view: p.get('tampilan') === 'daftar' ? 'daftar' : 'grid' };
}
function filterReleases(filters) {
  return releases.filter(release => {
    const artist = artistOf(release);
    const q = normalize(filters.q);
    return (!q || normalize(`${release.title} ${artist.name} ${artist.aliases.join(' ')} ${cityName(release.city)} ${release.format} ${release.genre} ${release.type}`).includes(q)) &&
      (!filters.genre || release.genre === filters.genre) &&
      (!filters.city || release.city === filters.city) &&
      (!filters.decade || Math.floor(release.year / 10) * 10 === Number(filters.decade)) &&
      (!filters.type || release.type === filters.type) &&
      (!filters.format || release.format === filters.format);
  }).sort((a, b) => filters.sort === 'terlama' ? a.year - b.year : filters.sort === 'judul' ? a.title.localeCompare(b.title, 'id') : b.year - a.year);
}
function selected(value, target) { return value === target ? 'selected' : ''; }
function releaseFilterPanel(f) {
  return `<div class="filter-panel collapse" id="releaseFilterPanel"><div class="filter-panel-header"><span>PERSEMPIT HASIL</span>${icon('filter', 18)}</div><div class="filter-field"><label for="filterQuery">KATA KUNCI</label><div class="filter-search">${icon('search', 17)}<input type="search" id="filterQuery" data-filter="q" value="${esc(f.q)}" placeholder="Judul atau artis..."></div></div><div class="filter-field"><label for="filterCity">KOTA</label><select id="filterCity" data-filter="city" class="form-select form-control-n"><option value="">Semua kota</option>${cities.map(city => `<option value="${city.slug}" ${selected(city.slug, f.city)}>${esc(city.name)}</option>`).join('')}</select></div><div class="filter-field"><label for="filterGenre">GENRE</label><select id="filterGenre" data-filter="genre" class="form-select form-control-n"><option value="">Semua genre</option>${GENRES.map(genre => `<option value="${esc(genre)}" ${selected(genre, f.genre)}>${esc(genre)}</option>`).join('')}</select></div><div class="filter-field"><label for="filterDecade">DEKADE</label><select id="filterDecade" data-filter="decade" class="form-select form-control-n"><option value="">Semua dekade</option>${[1990, 2000, 2010].map(decade => `<option value="${decade}" ${selected(String(decade), f.decade)}>${decade}-an</option>`).join('')}</select></div><div class="filter-field"><label for="filterType">JENIS</label><select id="filterType" data-filter="type" class="form-select form-control-n"><option value="">Semua jenis</option>${TYPES.map(type => `<option value="${esc(type)}" ${selected(type, f.type)}>${esc(type)}</option>`).join('')}</select></div><div class="filter-field"><label for="filterFormat">FORMAT</label><select id="filterFormat" data-filter="format" class="form-select form-control-n"><option value="">Semua format</option>${FORMATS.map(format => `<option value="${esc(format)}" ${selected(format, f.format)}>${esc(format)}</option>`).join('')}</select></div><button type="button" class="reset-filter" data-action="reset-filters">HAPUS SEMUA FILTER ${icon('refresh', 16)}</button><div class="filter-foot">FILTER TERSIMPAN DI TAUTAN · BISA DIBAGIKAN</div></div>`;
}
function releaseResultMarkup(f) {
  const filtered = filterReleases(f);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 9));
  const page = Math.min(f.page, totalPages);
  const display = filtered.slice((page - 1) * 9, page * 9);
  const activeFilters = [f.q && `Pencarian: ${f.q}`, f.city && cityName(f.city), f.genre, f.decade && `${f.decade}-an`, f.type, f.format].filter(Boolean);
  return `<div class="directory-results-top"><p id="resultCount" role="status" aria-live="polite"><strong>${filtered.length}</strong> RILISAN DITEMUKAN <span>/ DATA ILUSTRATIF</span></p><div class="directory-results-actions"><label class="visually-hidden" for="sortReleases">Urutkan rilisan</label><select id="sortReleases" data-filter="sort" class="form-select sort-select"><option value="terbaru" ${selected('terbaru', f.sort)}>Terbaru</option><option value="terlama" ${selected('terlama', f.sort)}>Terlama</option><option value="judul" ${selected('judul', f.sort)}>A–Z</option></select><div class="view-toggle" role="group" aria-label="Tampilan hasil"><button type="button" data-action="view" data-view="grid" class="${f.view === 'grid' ? 'active' : ''}" aria-label="Tampilan grid" aria-pressed="${f.view === 'grid'}">${icon('grid', 18)}</button><button type="button" data-action="view" data-view="daftar" class="${f.view === 'daftar' ? 'active' : ''}" aria-label="Tampilan daftar" aria-pressed="${f.view === 'daftar'}">${icon('list', 19)}</button></div></div></div>
  ${activeFilters.length ? `<div class="active-filters">${activeFilters.map(x => `<span>${esc(x)}</span>`).join('')}<button type="button" data-action="reset-filters">Hapus semua ×</button></div>` : ''}
  <div class="directory-grid ${f.view === 'daftar' ? 'directory-grid--list' : ''}" id="releaseGrid">${display.length ? display.map(release => releaseCard(release)).join('') : emptyState('Belum ada yang cocok.', `Tak ada rilisan contoh untuk filter ini. Coba hapus sebagian filter, atau catat ide untuk arsip.`, '/rilisan', 'KEMBALI KE SEMUA RILISAN')}</div>
  ${filtered.length > 9 ? `<nav class="pagination-n" aria-label="Halaman rilisan"><button type="button" data-action="page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">${icon('arrow', 19, 'flip-x')}</button>${Array.from({ length: totalPages }, (_, i) => `<button type="button" data-action="page" data-page="${i + 1}" ${page === i + 1 ? 'class="active" aria-current="page"' : ''}>${String(i + 1).padStart(2, '0')}</button>`).join('')}<button type="button" data-action="page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Halaman berikutnya">${icon('arrow', 19)}</button></nav>` : ''}`;
}
function releasesPage() {
  const f = releaseFilters();
  return `${pageIntro('DIREKTORI / 01', 'ARSIP RILISAN', 'SEMUA<br><em>RILISAN.</em>', 'Demo, EP, album, dan kaset yang layak diingat. Temukan berdasarkan kota, genre, dekade, atau format.', { aside: `<div class="intro-stat"><strong>${String(releases.length).padStart(2, '0')}</strong><span>ENTRI<br>CONTOH</span></div>` })}<section class="directory-section section-cream"><div class="site-container"><div class="directory-mobile-top"><button type="button" class="btn-filter-mobile" data-bs-toggle="collapse" data-bs-target="#releaseFilterPanel" aria-expanded="false" aria-controls="releaseFilterPanel">${icon('filter', 18)} FILTER RILISAN ${icon('arrowDown', 18)}</button></div><div class="directory-layout"><aside class="directory-sidebar" aria-label="Filter rilisan">${releaseFilterPanel(f)}</aside><div class="directory-content" id="releaseResults">${releaseResultMarkup(f)}</div></div>${demoNote('demo-note--directory')}</div></section>`;
}

function artistsPage() {
  const p = new URLSearchParams(location.search);
  const city = p.get('kota') || '';
  const q = p.get('q') || '';
  const matches = artists.filter(artist => (!city || artist.city === city) && (!q || normalize(`${artist.name} ${artist.aliases.join(' ')} ${cityName(artist.city)} ${artist.genres.join(' ')}`).includes(normalize(q))));
  return `${pageIntro('DIREKTORI / 02', 'ARSIP ARTIS', 'ORANG-ORANG<br>DI BALIK <em>BUNYI.</em>', 'Nama bisa berganti, formasi bisa berubah. Jejak mereka tetap punya tempat.', { aside: `<div class="intro-stat"><strong>0${artists.length}</strong><span>ARTIS<br>CONTOH</span></div>` })}<section class="simple-directory section-cream"><div class="site-container"><div class="simple-filters"><div class="filter-search">${icon('search', 18)}<form action="/artis" method="get" class="flex-grow-1"><input name="q" type="search" value="${esc(q)}" placeholder="Cari nama atau alias artis..." aria-label="Cari artis"></form></div><div class="city-chips" aria-label="Filter kota"><a class="${!city ? 'active' : ''}" href="/artis">SEMUA</a>${cities.slice(0, 4).map(c => `<a class="${city === c.slug ? 'active' : ''}" href="/artis?kota=${enc(c.slug)}">${esc(c.name.toUpperCase())}</a>`).join('')}</div></div><p class="directory-result-label">${matches.length} ARTIS DITEMUKAN / DATA ILUSTRATIF</p><div class="artist-grid">${matches.length ? matches.map(artistCard).join('') : emptyState('Nama itu belum ada di sini.', 'Coba ejaan lain atau bantu memperluas arsip.', '/artis', 'LIHAT SEMUA ARTIS')}</div>${demoNote('demo-note--directory')}</div></section>`;
}
function labelsPage() {
  return `${pageIntro('DIREKTORI / 03', 'ARSIP LABEL', 'DARI TANGAN<br>KE <em>TANGAN.</em>', 'Label-label mandiri adalah simpul penting tempat karya berpindah dan berumur panjang.', { aside: `<div class="intro-stat"><strong>0${labels.length}</strong><span>LABEL<br>CONTOH</span></div>` })}<section class="label-list-section section-cream"><div class="site-container"><div class="list-head"><span>IDENTITAS / KOTA</span><span>JUMLAH RILISAN</span><span>JELAJAHI</span></div>${labels.map((label, i) => `<a href="/label/${enc(label.slug)}" class="label-row"><div><span class="label-index">0${i + 1}</span><div><h2>${esc(label.name)}</h2><p>${esc(cityName(label.city))} <span class="meta-dot">·</span> SEJAK ${label.year} (ILUSTRASI)</p></div></div><strong>${String(releases.filter(r => r.label === label.slug).length).padStart(2, '0')}</strong><span class="label-row-arrow">${icon('arrowUp', 25)}</span></a>`).join('')}${demoNote('demo-note--directory')}</div></section>`;
}
function scenesPage() {
  return `${pageIntro('PETA SCENE / 04', 'JAWA TIMUR', 'KOTA PUNYA<br><em>SUARANYA.</em>', 'Bukan peta algoritma. Ini pintu masuk ke orang dan artefak dari berbagai sudut Jawa Timur.', { dark: true, aside: `<div class="intro-stat"><strong>0${cities.length}</strong><span>KOTA<br>DALAM DEMO</span></div>` })}<section class="scene-list-section section-cream"><div class="site-container"><div class="scene-list-intro"><p>SETIAP KOTA ADALAH PINTU MASUK.</p><p>Konten scene di bawah adalah contoh navigasi dan bukan kronologi historis terverifikasi.</p></div>${cities.map(city => `<a href="/scene/${enc(city.slug)}" class="scene-row" style="--row-accent:${city.color}"><span class="scene-row-index">${city.number} / 0${cities.length}</span><span class="scene-row-main"><strong>${esc(city.name)}</strong><small>${esc(city.mood)}</small></span><span class="scene-row-count">0${cityReleaseCount(city.slug)} RILISAN <span class="meta-dot">·</span> 0${cityArtistCount(city.slug)} ARTIS</span><span class="scene-row-arrow">${icon('arrowUp', 25)}</span></a>`).join('')}</div></section>`;
}
function sceneDetailPage(city) {
  const cityReleases = releases.filter(release => release.city === city.slug);
  const cityArtists = artists.filter(artist => artist.city === city.slug);
  return `<section class="city-detail-hero" style="--city-accent:${city.color}"><div class="site-container">${breadcrumbs([{ label: 'Scene', href: '/scene' }, { label: city.name }])}<div class="city-detail-top">${eyebrow(city.number + ' / 07', 'SCENE FILE / JAWA TIMUR', true)}<span>KOORDINAT / ${esc(city.code)} — INDONESIA</span></div><h1>${esc(city.name.toUpperCase())}<em>.</em></h1><div class="city-detail-foot"><p>${esc(city.summary)}</p><div><strong>${String(cityReleases.length).padStart(2, '0')}</strong><span>RILISAN CONTOH</span><strong>${String(cityArtists.length).padStart(2, '0')}</strong><span>ARTIS CONTOH</span></div></div><span class="city-hero-sun" aria-hidden="true"></span></div></section><section class="section-cream city-detail-content"><div class="site-container">${demoNote()}<div class="section-heading compact"><div>${eyebrow('ARSIP / 01', 'TERCATAT DARI KOTA INI')}<h2>JEJAK <em>RILISAN.</em></h2></div><a href="/rilisan?kota=${enc(city.slug)}" class="section-side-link">FILTER KOTA INI ${icon('arrowUp', 17)}</a></div><div class="featured-grid">${cityReleases.length ? cityReleases.slice(0, 4).map(release => releaseCard(release)).join('') : emptyState('Belum ada rilisan contoh.', 'Kota ini masih menunggu entri dalam demonstrasi.', '/rilisan', 'JELAJAHI SEMUA RILISAN')}</div><div class="section-heading compact city-artists-title"><div>${eyebrow('ARSIP / 02', 'ORANG-ORANGNYA')}<h2>KENALI <em>ARTISNYA.</em></h2></div></div><div class="artist-grid">${cityArtists.length ? cityArtists.map(artistCard).join('') : `<p>Belum ada artis contoh dari kota ini.</p>`}</div>${sceneExtras(city)}<a href="/scene" class="btn-ink city-back">← KEMBALI KE SEMUA KOTA</a></div></section>`;
}
function genrePage(genre) {
  const matches = releases.filter(release => release.genre.toLowerCase() === genre.toLowerCase() || artistOf(release).genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  return `${pageIntro('GENRE / ARSIP', 'JALUR SUARA', `${esc(genre.toUpperCase())}<em>.</em>`, 'Menelusuri rilisan lewat kedekatan bunyi. Batas genre bisa beririsan; sebuah entri tidak harus berhenti di satu kotak.')}
  <section class="section-cream directory-section"><div class="site-container"><div class="directory-result-label">${matches.length} RILISAN CONTOH DENGAN GENRE INI</div><div class="featured-grid">${matches.length ? matches.map(r => releaseCard(r)).join('') : emptyState('Genre ini belum punya entri.', 'Bantu lengkapi arsip.', '/rilisan', 'LIHAT SEMUA RILISAN')}</div></div></section>`;
}

function sceneExtras(city) {
  const localGigs = gigs.filter(g => g.city === city.slug);
  const localZines = zines.filter(z => z.city === city.slug);
  if (!localGigs.length && !localZines.length) return '';
  return `<div class="context-area">${eyebrow('ARSIP / 03', 'DI LUAR RAK RILISAN')}<div class="section-heading compact"><h2>FLYER & <em>HALAMAN.</em></h2><a href="/linimasa" class="section-side-link">LINIMASA ARSIP ${icon('arrowUp',17)}</a></div><div class="context-cards">${localGigs.map(g=>`<a href="/gig/${enc(g.slug)}"><img src="${coverPath(g.flyer,true)}" alt="" loading="lazy"><span>GIG / ${g.year}</span><strong>${esc(g.title)}</strong>${icon('arrowUp',18)}</a>`).join('')}${localZines.map(z=>`<a href="/zine/${enc(z.slug)}"><img src="${coverPath(z.cover,true)}" alt="" loading="lazy"><span>ZINE / ${esc(z.period)}</span><strong>${esc(z.name)}</strong>${icon('arrowUp',18)}</a>`).join('')}</div></div>`;
}
function artistExtras(artist) {
  const appearances = gigs.filter(g => g.lineup.some(p => p.artist === artist.slug));
  if (!appearances.length) return '';
  return `<div class="context-area">${eyebrow('ARSIP / PANGGUNG', 'PERTUNJUKAN TERHUBUNG')}<div class="section-heading compact"><h2>DALAM <em>FLYER.</em></h2><a href="/gig" class="section-side-link">SEMUA GIG ${icon('arrowUp',17)}</a></div><div class="context-cards">${appearances.map(g=>`<a href="/gig/${enc(g.slug)}"><img src="${coverPath(g.flyer,true)}" alt="" loading="lazy"><span>${esc(cityName(g.city).toUpperCase())} / ${g.year}</span><strong>${esc(g.title)}</strong>${icon('arrowUp',18)}</a>`).join('')}</div><p class="context-foot">Pertunjukan dan flyer di atas sepenuhnya fiktif.</p></div>`;
}
function releaseExtras(release) {
  const appearances = gigs.filter(g => g.lineup.some(p => p.artist === release.artist)).slice(0, 2);
  return `<div class="release-extras"><div class="detail-section-title section-offset">${eyebrow('KREDIT & KETERSEDIAAN', 'BELUM SEMUA SUDAH DITEMUKAN')}<h2>ORANG, KATA <em>& CELAH.</em></h2><p>Peran dan sumber ditampilkan bersama; kosong berarti belum ada bukti dalam demo.</p></div><div class="credit-list">${release.credits.map(c=>`<div><span>${esc(c.role.toUpperCase())}</span><strong>${esc(c.name)}</strong><small>${esc(c.source)}</small></div>`).join('')}</div>${release.lyricExcerpt ? `<div class="lyric-demo"><span>CONTOH STRUKTUR KUTIPAN / KARYA ORISINAL KHUSUS DEMO</span><blockquote>${esc(release.lyricExcerpt).replace(/\n/g,'<br>')}</blockquote><p>Bukan lirik historis lagu pada rilisan ini. Teks pendek orisinal ini hanya menunjukkan letak bidang kutipan dengan keterangan hak yang jelas.</p></div>` : `<div class="missing-callout">${icon('info',20)}<div><strong>Belum ada kutipan lirik yang boleh ditampilkan.</strong><p>Lirik nyata memerlukan izin atau dasar penggunaan yang tepat; tidak ada teks yang dibuat-buat untuk mengisi bidang ini.</p></div></div>`}${appearances.length ? `<div class="mini-connections"><span class="mono-label">JEJAK PANGGUNG TERKAIT / DEMONSTRASI</span>${appearances.map(g=>`<a href="/gig/${enc(g.slug)}">${esc(g.title)} <small>${g.year} / ${esc(cityName(g.city))}</small>${icon('arrowUp',17)}</a>`).join('')}</div>` : ''}</div>`;
}
function metaItem(label, value) { return `<div class="detail-meta-item"><dt>${label}</dt><dd>${value}</dd></div>`; }
function releaseDetailPage(release) {
  const artist = artistOf(release);
  const label = labelOf(release);
  const related = releases.filter(item => item.slug !== release.slug && (item.artist === release.artist || item.genre === release.genre)).slice(0, 4);
  return `<section class="release-detail-hero"><div class="site-container">${breadcrumbs([{ label: 'Rilisan', href: '/rilisan' }, { label: release.title }])}
    <div class="release-detail-layout"><div class="detail-art-col"><button class="detail-art-button" type="button" data-action="show-cover" data-cover="${esc(release.cover)}" data-title="${esc(release.title)}" aria-label="Perbesar artwork ilustratif ${esc(release.title)}">${imageTag(release.cover, `Artwork ilustratif untuk rilisan fiktif ${release.title}`, 'detail-art-image', true)}<span class="zoom-affordance">${icon('image', 17)} LIHAT ARTWORK</span></button><p class="detail-art-credit">FIG. ${String(releases.indexOf(release) + 1).padStart(3, '0')} <span>·</span> ARTWORK ORISINAL UNTUK PROTOTIPE, BUKAN SCAN ASLI</p></div>
    <div class="detail-heading-col">${eyebrow('ARSIP / RILISAN', `${release.type.toUpperCase()} — ${release.year}`, true)}<span class="detail-demo-badge"><span class="status-pulse"></span> ENTRI DEMONSTRASI</span><h1>${esc(release.title)}<span class="title-period">.</span></h1><a class="detail-artist-link" href="/artis/${enc(artist.slug)}">${esc(artist.name)} ${icon('arrowUp', 19)}</a><p class="detail-summary">${esc(release.description)}</p><div class="detail-tags"><a href="/genre/${slugify(release.genre)}">${esc(release.genre)}</a><span>${esc(release.format)}</span><span>${esc(release.type)}</span></div>
    <dl class="detail-meta-grid">${metaItem('TAHUN RILIS', `<strong>${release.year}</strong> <span class="precision-badge">${icon('info', 14)} ${esc(release.precision)}</span>`)}${metaItem('KOTA', `<a href="/scene/${enc(release.city)}">${esc(cityName(release.city))} ${icon('arrowUp', 14)}</a>`)}${metaItem('LABEL', label ? `<a href="/label/${enc(label.slug)}">${esc(label.name)} ${icon('arrowUp', 14)}</a>` : 'Rilis mandiri / belum tercatat')}${metaItem('NOMOR KATALOG', esc(release.catalog || 'Belum terdokumentasi'))}</dl>
    <div class="detail-actions">${captureLink('rilisan', release.slug)}<button class="btn-acid" type="button" data-action="cite" data-slug="${esc(release.slug)}">${icon('quote', 19)} KUTIP ARSIP</button><button class="btn-outline-light ${isSaved(release.slug) ? 'is-saved' : ''}" type="button" data-action="bookmark" data-slug="${esc(release.slug)}" aria-pressed="${isSaved(release.slug)}">${icon('bookmark', 18)} <span class="save-label">${isSaved(release.slug) ? 'TERSIMPAN' : 'SIMPAN'}</span></button><button class="btn-icon-light" type="button" data-action="share" data-url="/rilisan/${esc(release.slug)}" data-title="${esc(release.title)}" aria-label="Bagikan tautan rilisan">${icon('share', 19)}</button></div><div class="detail-presisi-note">${icon('info', 19)} <p><strong>Tentang ketepatan data.</strong> Tahun ditampilkan dengan presisi “${esc(release.precision.toLowerCase())}”. Dalam arsip sungguhan, setiap fakta harus dilengkapi sumber yang bisa diperiksa.</p></div>
    </div></div><nav class="detail-anchor-nav" aria-label="Bagian entri"><a href="#tracklist">TRACKLIST <span>↓</span></a><a href="#edisi">EDISI & FORMAT <span>↓</span></a><a href="#sumber">SUMBER & RIWAYAT <span>↓</span></a></nav></div></section>
    <section class="release-detail-body section-cream"><div class="site-container detail-body-grid"><div class="detail-main"><div id="tracklist" class="detail-section-title">${eyebrow('01 / 03', 'ISI RILISAN')}<h2>DAFTAR <em>LAGU.</em></h2><p>Jejak setiap lagu tercatat, bahkan saat belum ada tautan dengar resmi.</p></div><div class="tracklist"><div class="tracklist-head"><span>NO. / JUDUL</span><span>DURASI</span><span>DENGARKAN</span></div>${release.tracks.map((track, i) => `<div class="track-row"><span class="track-no">${String(i + 1).padStart(2, '0')}</span><div class="track-title"><strong>${esc(track.title)}</strong>${track.officialLinks.length ? `<span>TAUTAN RESMI TERSEDIA</span>` : `<span>TAUTAN RESMI BELUM DIDOKUMENTASIKAN</span>`}</div><span class="track-duration">${esc(track.duration)}</span><div class="track-action">${track.officialLinks.length ? track.officialLinks.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener nofollow" aria-label="Buka ${esc(l.platform)} untuk ${esc(track.title)}">${icon('external', 18)}</a>`).join('') : `<span title="Tidak ada tautan dengar resmi" aria-label="Belum ada tautan dengar resmi">—</span>`}</div></div>`).join('')}</div>
    <div class="audio-policy"><span class="audio-policy-icon">${icon('headphonesOff', 25)}</span><div><strong>Arsip ini bukan layanan streaming.</strong><p>Audio hanya diputar di Noiseantara jika ada izin eksplisit pemegang hak. Untuk entri contoh ini belum ada audio atau pranala resmi yang didokumentasikan.</p></div></div>
    <div id="edisi" class="detail-section-title section-offset">${eyebrow('02 / 03', 'BENTUK FISIK & DIGITAL')}<h2>EDISI / <em>CETAKAN.</em></h2></div><div class="edition-list">${release.editions.map((edition, i) => `<div class="edition-item"><span class="edition-num">0${i + 1}</span><div><strong>${esc(edition.label)}</strong><p>${esc(edition.note)}</p></div><span>${esc(edition.format)} <span class="meta-dot">/</span> ${edition.year || 'TAHUN ?'}</span></div>`).join('')}</div>
    <div id="sumber" class="detail-section-title section-offset">${eyebrow('03 / 03', 'BUKA SUMBERNYA')}<h2>SUMBER & <em>RIWAYAT.</em></h2><p>Arsip yang baik menunjukkan dari mana informasinya berasal—juga apa yang belum diketahui.</p></div><div class="source-list">${release.sources.map((source, i) => `<div class="source-item"><span>[${i + 1}]</span><div><strong>${esc(source.type)}</strong><p>${esc(source.description)}</p></div>${icon('file', 20)}</div>`).join('')}</div>${releaseExtras(release)}<a href="/rilisan/${enc(release.slug)}/riwayat" class="version-link"><span>${icon('layers', 23)}</span><span><strong>LIHAT RIWAYAT ENTRI</strong><small>Versi 1 · Belum ada perubahan pada data demonstrasi ini</small></span>${icon('arrowUp', 21)}</a>
    <div class="detail-contribute-strip"><div><span>ADA YANG BELUM TERCATAT?</span><h3>ARSIP INI BISA KAMU LENGKAPI.</h3><p>Punya informasi, scan, atau koreksi? Mulai dari draf kontribusi.</p></div><a href="/kontribusi?rilisan=${enc(release.slug)}" class="btn-ink">BANTU LENGKAPI ${icon('arrowUp', 18)}</a></div></div>
    <aside class="detail-sidebar"><div class="fact-card"><span class="mono-label">LEMBAR ENTRI / ${String(releases.indexOf(release) + 1).padStart(3, '0')}</span><h3>SEKILAS<br>RILISAN.</h3><dl><div><dt>ARTIS</dt><dd><a href="/artis/${enc(artist.slug)}">${esc(artist.name)}</a></dd></div><div><dt>ASAL</dt><dd>${esc(cityName(release.city))}</dd></div><div><dt>GENRE</dt><dd>${esc(release.genre)}</dd></div><div><dt>JENIS</dt><dd>${esc(release.type)}</dd></div><div><dt>FORMAT</dt><dd>${esc(release.format)}</dd></div><div><dt>TRACK</dt><dd>${String(release.tracks.length).padStart(2, '0')} LAGU</dd></div><div><dt>EDISI</dt><dd>${String(release.editions.length).padStart(2, '0')} TERCATAT</dd></div><div><dt>SUMBER</dt><dd>${String(release.sources.length).padStart(2, '0')} SIMULASI</dd></div></dl><button type="button" data-action="report" class="report-link">LAPORKAN MASALAH / KLAIM HAK ${icon('arrowUp', 17)}</button></div><div class="sidebar-credit"><span>CATATAN KREDIT</span><p>Artwork & metadata entri ini dibuat untuk mendemonstrasikan antarmuka, bukan disalin dari artefak asli.</p></div></aside></div></section>
    ${related.length ? `<section class="related-section section-cream"><div class="site-container">${eyebrow('SELANJUTNYA', 'TEMUKAN YANG LAIN')}<div class="section-heading compact"><h2>MASIH DALAM <em>ARSIP.</em></h2><a href="/rilisan" class="section-side-link">JELAJAHI SEMUA ${icon('arrowUp', 17)}</a></div><div class="featured-grid">${related.map(r => releaseCard(r)).join('')}</div></div></section>` : ''}`;
}
function historyPage(release, version = false) {
  const url = `/rilisan/${enc(release.slug)}`;
  return `<section class="history-hero"> <div class="site-container">${breadcrumbs([{ label: 'Rilisan', href: '/rilisan' }, { label: release.title, href: url }, { label: version ? 'Versi 1' : 'Riwayat' }])}${eyebrow('JEJAK PERUBAHAN', 'ARSIP TANPA EDIT SUNYI', true)}<h1>${version ? 'VERSI <em>01.</em>' : 'RIWAYAT <em>ENTRI.</em>'}</h1><p>${esc(release.title)} — ${esc(artistOf(release).name)}</p></div></section><section class="section-cream history-content"><div class="site-container"><div class="history-layout"><div><div class="history-entry"><span class="history-dot"></span><div class="history-entry-meta">VERSI 1 <span>/</span> 24 SEPTEMBER 2026</div><h2>${version ? 'Snapshot awal entri contoh.' : 'Entri contoh dibuat.'}</h2><p>Ini adalah riwayat ilustratif. Tidak ada perubahan nyata atau proses moderasi yang diklaim telah terjadi dalam prototipe frontend ini.</p><div class="history-field"><span>JUDUL</span><strong>${esc(release.title)}</strong></div><div class="history-field"><span>ARTIS</span><strong>${esc(artistOf(release).name)}</strong></div><div class="history-field"><span>TAHUN / PRESISI</span><strong>${release.year} · ${esc(release.precision)}</strong></div><div class="history-field"><span>TRACKLIST</span><strong>${release.tracks.length} lagu tercantum</strong></div><a href="${url}/versi/1" class="btn-ink">PERMALINK VERSI 1 ${icon('arrowUp', 17)}</a></div></div><aside><div class="fact-card"><span class="mono-label">TAUTAN PERMANEN</span><h3>VERSI YANG BISA DIRUJUK.</h3><p>Saat arsip sungguhan berubah, setiap versi tetap dapat dibuka. Pada demo ini hanya tersedia satu snapshot ilustratif.</p><a href="${url}" class="text-link">KEMBALI KE ENTRI ${icon('arrow', 16)}</a></div></aside></div></div></section>`;
}
function artistDetailPage(artist) {
  const discography = releases.filter(r => r.artist === artist.slug).sort((a, b) => a.year - b.year);
  return `<section class="artist-detail-hero"><div class="site-container">${breadcrumbs([{ label: 'Artis', href: '/artis' }, { label: artist.name }])}<div class="artist-detail-hero-inner"><div class="artist-detail-visual">${imageTag(artist.cover, `Artwork ilustratif untuk artis fiktif ${artist.name}`, '', true)}<span>VISUAL ILUSTRATIF / BUKAN FOTO ARTIS ASLI</span></div><div class="artist-detail-copy">${eyebrow('ARSIP / ARTIS', cityName(artist.city).toUpperCase(), true)}<span class="detail-demo-badge"><span class="status-pulse"></span> PROFIL DEMONSTRASI</span><h1>${esc(artist.name)}<em>.</em></h1><p class="artist-tagline">${esc(artist.short)}</p><div class="artist-overview"><div><span>ASAL</span><a href="/scene/${enc(artist.city)}">${esc(cityName(artist.city))} ${icon('arrowUp', 14)}</a></div><div><span>TERBENTUK</span><strong>${artist.formed} <small>(ILUSTRASI)</small></strong></div><div><span>STATUS</span><strong>${esc(artist.status)}</strong></div></div><div class="detail-tags">${artist.genres.map(genre => `<a href="/genre/${slugify(genre)}">${esc(genre)}</a>`).join('')}</div><div class="detail-actions">${captureLink('artis', artist.slug)}<a href="#diskografi" class="btn-acid">JELAJAHI DISKOGRAFI ${icon('arrow', 18)}</a><button class="btn-outline-light" type="button" data-action="share" data-url="/artis/${esc(artist.slug)}" data-title="${esc(artist.name)}">${icon('share', 18)} BAGIKAN</button></div></div></div></div></section><section class="artist-detail-body section-cream"><div class="site-container"><div class="artist-bio-grid"><div>${eyebrow('01 / 03', 'DOKUMENTASI ARTIS')}<h2>TENTANG <em>${esc(artist.name.toUpperCase())}.</em></h2><p>${esc(artist.bio)}</p><p class="bio-notice">${icon('info', 18)} Nama, personel, dan informasi tahun pada profil ini adalah contoh untuk rancangan antarmuka.</p></div><div class="artist-bio-aside"><span>ALIAS / EJAAN LAIN</span><p>${artist.aliases.length ? artist.aliases.map(esc).join(', ') : 'Belum ada alias yang tercatat.'}</p><span>SUMBER</span><p>Sumber simulasi untuk antarmuka. Belum diverifikasi.</p></div></div><div id="diskografi" class="section-heading compact"> <div>${eyebrow('02 / 03', 'YANG MEREKA TINGGALKAN')}<h2>DISKOGRAFI <em>ARSIP.</em></h2></div><span class="mono-label">${discography.length} RILISAN CONTOH</span></div><div class="featured-grid">${discography.map(r => releaseCard(r)).join('')}</div>${artistExtras(artist)}<div class="artist-bottom-grid"><div>${eyebrow('03 / 03', 'SIAPA YANG TERLIBAT')}<h2>FORMASI / <em>PERSONEL.</em></h2>${artist.members.length ? `<div class="member-list">${artist.members.map(member => `<div><strong>${esc(member.name)}</strong><span>${esc(member.role)}</span><span>${esc(member.period)}</span></div>`).join('')}</div>` : `<p class="missing-data">Belum terdokumentasi dalam contoh ini. <a href="/kontribusi?artis=${enc(artist.slug)}">Bantu lengkapi →</a></p>`}</div><div class="artist-help"><span>ADA CERITA LAIN?</span><h3>SEJARAHNYA BELUM SELESAI.</h3><p>Usulkan informasi yang bisa dibuktikan. Tidak ada perubahan yang langsung menimpa data arsip.</p><a href="/kontribusi?artis=${enc(artist.slug)}" class="btn-ink">BANTU LENGKAPI ${icon('arrowUp', 17)}</a><button type="button" data-action="report" class="report-link">LAPORKAN MASALAH ${icon('arrowUp', 16)}</button></div></div></div></section>`;
}
function labelDetailPage(label) {
  const catalog = releases.filter(r => r.label === label.slug).sort((a, b) => a.year - b.year);
  return `<section class="label-detail-hero"><div class="site-container">${breadcrumbs([{ label: 'Label', href: '/label' }, { label: label.name }])}${eyebrow('ARSIP / LABEL', 'KATALOG MANDIRI', true)}<h1>${esc(label.name)}<em>.</em></h1><div class="label-detail-overview"><p>${esc(label.description)}</p><div><span>${icon('pin', 19)} ${esc(cityName(label.city))}</span><span>${icon('clock', 19)} ${label.year} (ILUSTRASI)</span><span>${icon('disc', 19)} ${catalog.length} RILISAN CONTOH</span></div></div></div></section><section class="section-cream label-catalog"><div class="site-container">${demoNote()}${eyebrow('KATALOG / 01', 'URUTAN RILISAN')}<h2>YANG PERNAH<br><em>TERBIT.</em></h2><div class="label-catalog-list">${catalog.map((release, i) => `<a href="/rilisan/${enc(release.slug)}"><span class="label-catalog-no">${String(i + 1).padStart(2, '0')}</span>${imageTag(release.cover, `Artwork ilustratif ${release.title}`)}<div><strong>${esc(release.title)}</strong><span>${esc(artistOf(release).name)} / ${esc(release.format)}</span></div><span class="label-catalog-year">${release.year}</span>${icon('arrowUp', 22)}</a>`).join('')}</div><a href="/label" class="btn-ink mt-5">← LIHAT SEMUA LABEL</a><button type="button" data-action="report" class="report-link">LAPORKAN MASALAH / KLAIM HAK ${icon('arrowUp', 16)}</button></div></section>`;
}
function articlesPage() {
  return `${pageIntro('PUSTAKA / 05', 'CATATAN & CERITA', 'BACA DI BALIK<br><em>KEBISINGAN.</em>', 'Arsip menyimpan data. Cerita membantu kita mengerti mengapa data itu berarti.', { aside: `<div class="intro-stat"><strong>0${articles.length}</strong><span>CATATAN<br>EDITORIAL</span></div>` })}<section class="section-cream articles-list"><div class="site-container"><p class="directory-result-label">PILIHAN REDAKSI / SEMUA ARTIKEL DEMONSTRASI</p><div class="articles-grid">${articles.map((article, i) => articleCard(article, i)).join('')}</div>${demoNote('demo-note--directory')}</div></section>`;
}
function articleDetailPage(article) {
  const image = article.image === 'scene-live' ? '/assets-public/optimized/scene-live.webp' : coverPath(article.image);
  const related = articles.filter(item => item.slug !== article.slug);
  return `<article class="article-detail"><header class="article-hero"><div class="site-container">${breadcrumbs([{ label: 'Pustaka', href: '/pustaka' }, { label: article.title }])}${eyebrow('PUSTAKA / ' + article.kicker, 'ESAI & CATATAN', true)}<h1>${esc(article.title)}</h1><p class="article-dek">${esc(article.summary)}</p><div class="article-meta-line"><span>OLEH <strong>${esc(article.author)}</strong></span><span>${esc(article.date).toUpperCase()}</span><span>${article.minutes} MENIT BACA</span></div></div></header><div class="article-wide-image"><img src="${image}" alt="Ilustrasi editorial untuk ${esc(article.title)}, bukan foto peristiwa sejarah" width="1400" height="933"><span>ILUSTRASI EDITORIAL / NOISEANTARA</span></div><div class="section-cream article-content-wrap"><div class="site-container article-content-layout"><aside class="article-side-nav"><span>DALAM CERITA INI</span>${article.sections.map((section, i) => `<a href="#bagian-${i + 1}">0${i + 1} / ${esc(section.heading)}</a>`).join('')}<div class="article-tools"><button type="button" data-action="reader-mode" aria-pressed="false">${icon('book', 17)} MODE BACA</button><button type="button" data-action="share" data-url="/pustaka/${esc(article.slug)}" data-title="${esc(article.title)}">${icon('share', 17)} BAGIKAN</button><button type="button" data-action="print">${icon('file', 17)} CETAK</button></div></aside><div class="article-prose" id="articleProse"><div class="article-prose-intro"><span class="drop-cap">N</span><p>Noiseantara adalah tempat bagi potongan-potongan yang hampir tercecer. Catatan ini mengajak kita melihat mengapa cara mengingat sama pentingnya dengan apa yang diingat.</p></div>${article.sections.map((section, i) => `<section id="bagian-${i + 1}"><span class="article-section-no">0${i + 1} / CATATAN</span><h2>${esc(section.heading)}</h2>${section.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}</section>`).join('')}<div class="article-end-mark">✳</div><div class="article-disclaimer">${icon('info', 19)} <span>Artikel dan ilustrasi ini dibuat untuk mendemonstrasikan tampilan Pustaka Noiseantara. Bukan riset sejarah tentang artis atau peristiwa tertentu.</span></div><a href="/pustaka" class="text-link">← KEMBALI KE PUSTAKA</a></div><aside class="article-side-note"><span>INGAT INI</span><p>“Lebih baik entri kosong yang jujur daripada tanggal pasti yang dikarang.”</p><small>PRINSIP ARSIP / 01</small></aside></div></div></article><section class="related-section section-cream"><div class="site-container">${eyebrow('BACA SELANJUTNYA', 'DARI PUSTAKA')}<div class="articles-grid">${related.map((item, i) => articleCard(item, i)).join('')}</div></div></section>`;
}

function score(value, q) {
  const hay = normalize(value), needle = normalize(q);
  if (!needle) return 0;
  if (hay === needle) return 120;
  if (hay.startsWith(needle)) return 85;
  if (hay.split(' ').some(word => word.startsWith(needle))) return 58;
  if (hay.includes(needle)) return 36;
  return 0;
}
function parseArchiveQuery(query) {
  const filters = {};
  const terms = [];
  const operators = { tipe:'type', jenis:'type', type:'type', kota:'city', city:'city', tahun:'year', year:'year', dekade:'decade', era:'decade', genre:'genre', format:'format' };
  for (const token of (query.match(/(?:[^\s"]+:"[^"]+"|"[^"]+"|\S+)/g) || [])) {
    const match = token.match(/^([\w]+):(.+)$/);
    const key = match && operators[match[1].toLowerCase()];
    if (key) filters[key] = normalize(match[2].replace(/^"|"$/g,''));
    else terms.push(token.replace(/^"|"$/g,''));
  }
  return { filters, terms: terms.map(normalize).filter(Boolean) };
}
function getSearchResults(query) {
  const { filters, terms } = parseArchiveQuery(query);
  if (!terms.length && !Object.keys(filters).length) return [];
  const rows = [
    ...artists.map(a => ({ type:'Artis', title:a.name, subtitle:`${cityName(a.city)} · ${a.genres[0]}`, url:`/artis/${a.slug}`, cover:a.cover, city:a.city, year:a.formed, genres:a.genres, fields:[a.name,...a.aliases,a.short,...a.genres,cityName(a.city)] })),
    ...releases.map(r => ({ type:'Rilisan', title:r.title, subtitle:`${artistOf(r).name} · ${r.year}`, url:`/rilisan/${r.slug}`, cover:r.cover, city:r.city, year:r.year, genres:[r.genre], format:r.format, fields:[r.title,artistOf(r).name,r.genre,r.format,r.type,cityName(r.city),...r.tracks.map(t=>t.title)] })),
    ...gigs.map(g => ({ type:'Gig', title:g.title, subtitle:`${cityName(g.city)} · ${g.year} · flyer`, url:`/gig/${g.slug}`, cover:g.flyer, city:g.city, year:g.year, genres:g.genres, fields:[g.title,g.venue,g.summary,cityName(g.city),...g.genres,...g.lineup.map(l=>l.artist?artistBySlug(l.artist)?.name:l.text)] })),
    ...zines.map(z => ({ type:'Zine', title:z.name, subtitle:`${cityName(z.city)} · ${z.issues.length} isu`, url:`/zine/${z.slug}`, cover:z.cover, city:z.city, year:z.issues[0]?.year, years:z.issues.map(i=>i.year), fields:[z.name,z.style,z.period,z.description,cityName(z.city),...z.issues.map(i=>i.summary)] })),
    ...labels.map(l => ({ type:'Label', title:l.name, subtitle:cityName(l.city), url:`/label/${l.slug}`, cover:null, city:l.city, year:l.year, fields:[l.name,l.description,cityName(l.city)] })),
    ...cities.map(c => ({ type:'Scene', title:c.name, subtitle:'Kota di Jawa Timur', url:`/scene/${c.slug}`, cover:null, city:c.slug, fields:[c.name,c.mood,c.summary] })),
    ...articles.map(a => ({ type:'Pustaka', title:a.title, subtitle:`${a.kicker} · ${a.minutes} menit baca`, url:`/pustaka/${a.slug}`, cover:a.image === 'scene-live' ? null : a.image, year:Number(a.date.match(/\d{4}/)?.[0]), fields:[a.title,a.summary,a.kicker,...a.sections.map(x=>x.heading)] })),
    ...needs.map(n => ({ type:'Kebutuhan', title:n.title, subtitle:`${n.kind} · ${n.type}`, url:`/dibutuhkan#${n.id}`, cover:null, city:n.city, year:n.year, fields:[n.title,n.kind,n.type,n.why,cityName(n.city)] }))
  ];
  const typeNames = { artikel:'Pustaka', acara:'Gig', konser:'Gig', flyer:'Gig', band:'Artis', isu:'Zine', issue:'Zine', 'yang-dibutuhkan':'Kebutuhan' };
  return rows.filter(item => {
    const f = filters;
    const type = typeNames[f.type] || f.type;
    if (type && normalize(item.type) !== normalize(type)) return false;
    if (f.city && !normalize(`${item.city || ''} ${item.city ? cityName(item.city) : ''}`).includes(f.city)) return false;
    if (f.year && !(item.years || [item.year]).some(y => String(y) === f.year)) return false;
    if (f.decade && !(item.years || [item.year]).some(y => String(Math.floor(Number(y) / 10) * 10) === f.decade.replace(/\s*an$/, ''))) return false;
    if (f.genre && !(item.genres || []).some(g => normalize(g).includes(f.genre))) return false;
    if (f.format && !normalize(item.format).includes(f.format)) return false;
    return terms.every(term => item.fields.some(field => normalize(field).includes(term)));
  }).map(item => {
    const rank = terms.length ? terms.reduce((sum,term) => {
      const titleScore = score(item.title,term);
      const secondary = Math.max(0,...item.fields.slice(1).map(field=>score(field,term)));
      return sum + Math.max(titleScore ? titleScore + 20 : 0, secondary * .65);
    },0) : 10;
    return { ...item, rank };
  }).sort((a,b) => b.rank-a.rank || a.title.localeCompare(b.title,'id'));
}
function searchPage() {
  const q = new URLSearchParams(location.search).get('q')?.trim() || '';
  const results = getSearchResults(q);
  const groups = ['Artis','Rilisan','Gig','Zine','Label','Scene','Pustaka','Kebutuhan'];
  return `<section class="search-page-hero"><div class="site-container">${eyebrow('PENCARIAN', 'MENELUSURI INGATAN', true)}<h1>CARI APA YANG<br><em>TERTINGGAL.</em></h1><form action="/cari" method="get" class="search-page-form" role="search">${icon('search',25)}<input type="search" name="q" value="${esc(q)}" placeholder="Artis, gig, zine, kota..." aria-label="Cari di seluruh arsip" autofocus><button class="btn-acid" type="submit">CARI ${icon('arrow',18)}</button></form><p>Pencarian mencakup rilisan, artis, gig, zine, label, kota, artikel, dan kebutuhan dokumentasi. <span>Tekan ⌘K atau Ctrl+K kapan saja.</span></p></div></section><section class="section-cream search-page-results"><div class="site-container"><div class="search-language"><div><span>BAHASA PENCARIAN / OPSIONAL</span><strong>Persempit dengan operator.</strong></div><div><a href="/cari?q=${enc('tipe:gig kota:malang')}"><code>tipe:gig kota:malang</code> ${icon('arrowUp',15)}</a><a href="/cari?q=${enc('tahun:2003 genre:punk')}"><code>tahun:2003 genre:punk</code> ${icon('arrowUp',15)}</a><a href="/cari?q=${enc('"Malam Rongga"')}"><code>"Malam Rongga"</code> ${icon('arrowUp',15)}</a></div></div><div class="directory-result-label">${q ? `${results.length} HASIL UNTUK “${esc(q)}” / DATA ILUSTRATIF` : 'MULAI DENGAN SEBUAH NAMA ATAU JUDUL'}</div>${q && !results.length ? emptyState(`Belum ada yang cocok dengan “${q}”.`, 'Coba kata atau operator lain, atau catat yang belum ada.', '/kontribusi', 'BUAT DRAF') : q ? groups.map(group => { const items = results.filter(result => result.type === group); return items.length ? `<div class="search-group"><h2>${esc(group.toUpperCase())} <span>${items.length}</span></h2><div>${items.map(item => `<a href="${item.url}" class="search-result-row">${item.cover ? `<img src="${coverPath(item.cover,true)}" width="72" height="72" alt="">` : `<span class="search-result-symbol">${icon(group === 'Scene' ? 'pin' : group === 'Pustaka' ? 'book' : 'disc',24)}</span>`}<span><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span>${icon('arrowUp',19)}</a>`).join('')}</div></div>` : ''; }).join('') : `<div class="search-start-suggestions"><span>COBA JELAJAHI</span><a href="/cari?q=${enc('tipe:gig')}">Semua gig ${icon('arrowUp',17)}</a><a href="/cari?q=${enc('tipe:zine')}">Semua zine ${icon('arrowUp',17)}</a><a href="/cari?q=${enc('kota:surabaya')}">Surabaya ${icon('arrowUp',17)}</a><a href="/genre">Indeks genre ${icon('arrowUp',17)}</a></div>`}</div></section>`;
}

function savedPage() {
  const collection = saved().map(releaseBySlug).filter(Boolean);
  return `${pageIntro('DAFTAR BACA', 'DISIMPAN DI PERANGKATMU', 'SIMPAN DULU.<br><em>JELAJAHI LAGI.</em>', 'Tandai rilisan yang ingin kamu buka kembali. Daftar ini hanya disimpan di peramban yang sedang kamu pakai.', { aside: `<div class="intro-stat"><strong>${String(collection.length).padStart(2, '0')}</strong><span>TERSIMPAN<br>LOKAL</span></div>` })}<section class="section-cream saved-section"><div class="site-container"><div class="local-warning">${icon('info', 19)} Daftar ini hanya tersimpan di perangkat ini (localStorage). Menghapus data peramban akan menghapus daftar; tidak ada akun atau sinkronisasi.</div><div class="featured-grid">${collection.length ? collection.map(r => releaseCard(r)).join('') : emptyState('Rak bacaanmu masih kosong.', 'Saat menemukan rilisan menarik, tekan ikon penanda pada kartunya untuk menyimpannya di sini.', '/rilisan', 'JELAJAHI RILISAN')}</div></div></section>`;
}

function contributionPage() {
  const relatedSlug = new URLSearchParams(location.search).get('rilisan');
  const relatedArtist = new URLSearchParams(location.search).get('artis');
  const relatedName = releaseBySlug(relatedSlug)?.title || artistBySlug(relatedArtist)?.name || '';
  return `<section class="contribution-hero"><div class="site-container">${eyebrow('KONTRIBUSI', 'SATU ARTEFAK, SERIBU JALAN CERITA', true)}<h1>ARSIP DIMULAI<br>DARI <em>KAMU.</em></h1><div class="contribution-hero-bottom"><p>Punya kaset lama, ingatan tentang rilisan, atau foto sampul? Bantu susun kepingan sejarahnya—mulai dari sebuah draf.</p><a href="#contributionForm" class="contribution-jump">BUAT DRAF RILISAN <br>↓</a></div></div></section><section class="section-cream contribution-section"><div class="site-container"><div class="contrib-disclaimer">${icon('alert', 22)} <div><strong>Simulasi frontend, bukan formulir pengiriman.</strong><p>Draf tersimpan hanya di perambanmu. Tidak ada akun, server, unggah, atau antrean kurator pada prototipe ini. Jangan isi data sensitif.</p></div></div>${relatedName ? `<div class="related-form-hint">Kamu datang dari entri: <strong>${esc(relatedName)}</strong>. Form ini hanya demonstrasi draf rilisan baru, belum mengubah entri tersebut.</div>` : ''}<div class="contribution-layout"><aside class="contribution-aside">${eyebrow('PANDUAN CEPAT', 'SEBELUM MULAI')}<h2>TAK PERLU<br>TAHU <em>SEMUANYA.</em></h2><p>Isi yang kamu tahu. Tandai bagian yang belum pasti. Yang penting: sertakan asal informasi.</p><div class="contrib-principles"><div><span>01</span><strong>Jujur soal tanggal.</strong><p>Tahun perkiraan lebih baik daripada tanggal pasti yang ditebak.</p></div><div><span>02</span><strong>Sumber selalu menyertai.</strong><p>Kaset, zine, wawancara, atau keterangan langsung.</p></div><div><span>03</span><strong>Kredit tidak hilang.</strong><p>Catat pemilik koleksi dan asal artwork dengan jelas.</p></div></div><a href="/kontribusi/panduan" class="text-link">BACA PANDUAN LENGKAP ${icon('arrowUp', 17)}</a></aside><div class="contribution-form-card"><div class="form-card-head"><span>FORMULIR / RILISAN BARU</span><span id="draftStatus" role="status" aria-live="polite">DRAF LOKAL</span></div><div class="steps" role="list" aria-label="Langkah kontribusi"><button type="button" data-step-go="0" class="step active" role="listitem" aria-current="step"><span>01</span> DATA</button><button type="button" data-step-go="1" class="step" role="listitem"><span>02</span> TRACK & MEDIA</button><button type="button" data-step-go="2" class="step" role="listitem"><span>03</span> SUMBER</button><button type="button" data-step-go="3" class="step" role="listitem"><span>04</span> TINJAU</button></div><form id="contributionForm" novalidate>
    <div class="form-step active" data-form-step="0"><span class="form-step-label">LANGKAH 01 / IDENTITAS RILISAN</span><h3>Mulai dari yang kamu pegang.</h3><div class="form-grid"><div class="form-field span-2"><label for="releaseTitle">JUDUL RILISAN <span>*</span></label><input id="releaseTitle" name="releaseTitle" class="form-control form-control-n" maxlength="120" placeholder="Mis. Bising di Bawah Tanah" required></div><div class="form-field"><label for="releaseArtist">NAMA ARTIS / BAND <span>*</span></label><input id="releaseArtist" name="releaseArtist" class="form-control form-control-n" maxlength="100" placeholder="Sesuai ejaan pada rilisan" required></div><div class="form-field"><label for="releaseCity">KOTA ASAL <span>*</span></label><select id="releaseCity" name="releaseCity" class="form-select form-control-n" required><option value="">Pilih kota</option>${cities.map(city => `<option value="${city.slug}">${esc(city.name)}</option>`).join('')}</select></div><div class="form-field"><label for="releaseYear">TAHUN RILIS</label><input id="releaseYear" name="releaseYear" type="number" min="1960" max="2026" class="form-control form-control-n" placeholder="Jika diketahui"></div><div class="form-field"><label for="releasePrecision">KETEPATAN TANGGAL</label><select id="releasePrecision" name="releasePrecision" class="form-select form-control-n"><option value="tidak diketahui">Tidak diketahui</option><option value="tahun">Tahun pasti</option><option value="perkiraan">Perkiraan tahun</option></select></div><div class="form-field"><label for="releaseType">JENIS <span>*</span></label><select id="releaseType" name="releaseType" class="form-select form-control-n" required><option value="">Pilih jenis</option>${TYPES.map(x => `<option>${esc(x)}</option>`).join('')}</select></div><div class="form-field"><label for="releaseFormat">FORMAT <span>*</span></label><select id="releaseFormat" name="releaseFormat" class="form-select form-control-n" required><option value="">Pilih format</option>${FORMATS.map(x => `<option>${esc(x)}</option>`).join('')}</select></div><div class="form-field span-2"><label for="releaseNotes">CATATAN TAMBAHAN</label><textarea id="releaseNotes" name="releaseNotes" class="form-control form-control-n" rows="3" placeholder="Apa cerita yang sudah kamu tahu? Yang belum pasti juga boleh dicatat."></textarea></div></div></div>
    <div class="form-step" data-form-step="1"><span class="form-step-label">LANGKAH 02 / ISI & WUJUD</span><h3>Suara dan sampulnya.</h3><label class="field-label" for="trackRows">DAFTAR LAGU <span class="optional">(OPSIONAL UNTUK DRAF)</span></label><div id="trackRows" class="track-inputs"><div class="track-input-row"><span>01</span><input type="text" name="trackTitle" maxlength="120" class="form-control form-control-n" placeholder="Judul lagu"><button type="button" data-action="remove-track" aria-label="Hapus lagu" disabled>${icon('close', 16)}</button></div></div><button type="button" data-action="add-track" class="add-track">${icon('plus', 16)} TAMBAH LAGU</button><div class="form-divider"></div><label class="field-label" for="releaseMedia">FOTO SAMPUL / ARTEFAK</label><label class="upload-zone" for="releaseMedia">${icon('upload', 29)}<strong>Ambil foto atau pilih gambar</strong><span>JPG, PNG, WebP · maks. 5 MB · hanya pratinjau lokal</span><input type="file" id="releaseMedia" accept="image/jpeg,image/png,image/webp" capture="environment"></label><div id="imagePreview" class="image-preview"></div><div class="form-grid mt-4"><div class="form-field span-2"><label for="mediaAlt">DESKRIPSI GAMBAR (ALT TEXT)</label><input id="mediaAlt" name="mediaAlt" maxlength="150" class="form-control form-control-n" placeholder="Mis. Sampul kaset dengan ilustrasi gedung..."></div><div class="form-field"><label for="mediaCredit">KREDIT / PEMILIK KOLEKSI</label><input id="mediaCredit" name="mediaCredit" class="form-control form-control-n" placeholder="Nama yang boleh dicantumkan"></div><div class="form-field"><label for="mediaBasis">DASAR PENGGUNAAN</label><select id="mediaBasis" name="mediaBasis" class="form-select form-control-n"><option value="">Pilih dasar</option><option value="milik sendiri">Milik sendiri</option><option value="izin pemegang hak">Izin pemegang hak</option><option value="dokumentasi arsip">Dokumentasi arsip dengan itikad baik</option></select></div></div><p class="form-hint">Berkas tidak disimpan dalam draf localStorage dan akan hilang saat halaman dimuat ulang. Produk final mewajibkan alt text, kredit, dasar penggunaan, dan media sebelum pengiriman.</p></div>
    <div class="form-step" data-form-step="2"><span class="form-step-label">LANGKAH 03 / DASAR INFORMASI</span><h3>Dari mana kamu tahu?</h3><p class="form-step-copy">Sumber adalah bagian terpenting dari arsip. Untuk melanjutkan simulasi, isi setidaknya satu keterangan sumber.</p><div class="form-grid"><div class="form-field span-2"><label for="sourceType">JENIS SUMBER <span>*</span></label><select id="sourceType" name="sourceType" class="form-select form-control-n" required><option value="">Pilih jenis sumber</option><option>Koleksi fisik</option><option>Wawancara pelaku</option><option>Zine / media lama</option><option>Media online</option><option>Keterangan langsung</option><option>Lainnya</option></select></div><div class="form-field span-2"><label for="sourceDescription">KETERANGAN SUMBER <span>*</span></label><textarea id="sourceDescription" name="sourceDescription" rows="4" class="form-control form-control-n" placeholder="Mis. Kaset koleksi pribadi, foto sisi belakang sampul..." required></textarea></div><div class="form-field span-2"><label for="sourceUrl">PRANALA SUMBER <span class="optional">(JIKA ADA)</span></label><input type="url" id="sourceUrl" name="sourceUrl" class="form-control form-control-n" placeholder="https://..."></div></div><div class="source-tip">${icon('info', 20)} <p>Ingatan pribadi juga bisa menjadi titik awal. Cantumkan siapa yang memberi keterangan agar kurator nantinya punya jalan untuk memeriksa.</p></div></div>
    <div class="form-step" data-form-step="3"><span class="form-step-label">LANGKAH 04 / TINJAU DRAF</span><h3>Baca lagi sebelum disimpan.</h3><div id="draftPreview" class="draft-preview"></div><div class="form-final-note">${icon('alert', 19)} Ini <strong>bukan pengiriman</strong>. Tombol di bawah hanya menyimpan teks draf di perangkatmu.</div></div>
    <div id="formError" class="form-error" role="alert" aria-live="assertive" hidden></div><div class="form-nav"><button type="button" id="stepBack" class="btn-back" data-action="step-back" hidden>${icon('arrow', 17, 'flip-x')} KEMBALI</button><button type="button" id="stepNext" class="btn-ink" data-action="step-next">LANJUTKAN ${icon('arrow', 17)}</button><button type="button" id="saveDraft" class="btn-acid" data-action="save-draft" hidden>${icon('bookmark', 17)} SIMPAN DRAF DI PERANGKAT</button></div></form></div></div></div></section>`;
}
function guidePage() {
  return `${pageIntro('PANDUAN KONTRIBUSI', 'ARSIP YANG DIBANGUN BERSAMA', 'DIMULAI DARI<br><em>SATU JEJAK.</em>', 'Tak perlu jadi sejarawan untuk membantu. Mulai dari apa yang benar-benar kamu punya dan ketahui.')}
  <section class="section-cream guide-section"><div class="site-container"><div class="guide-intro">${demoNote()}<p>Ini adalah panduan antarmuka demonstrasi. Pada layanan produksi, semua kontribusi masuk antrean kurator dan tidak langsung tayang.</p></div><div class="guide-grid"><div><span>01 / TEMUKAN</span><h2>CARI DULU.</h2><p>Pastikan rilisan atau band yang kamu pegang belum tercatat. Kalau sudah ada, usulkan pelengkap atau koreksi—jangan buat entri duplikat.</p><a href="/rilisan" class="text-link">TELUSURI RILISAN ${icon('arrowUp', 17)}</a></div><div><span>02 / FOTO</span><h2>FOTO YANG JELAS.</h2><p>Usahakan sampul depan dan belakang terbaca. Jangan hilangkan konteks, catat pemilik koleksi, dan jelaskan dasar penggunaan gambar.</p></div><div><span>03 / SUMBER</span><h2>SEBUTKAN ASALNYA.</h2><p>Kaset fisik, halaman zine, wawancara, atau penjelasan pelaku. Sumber membuat orang lain bisa mengikuti jejak faktanya.</p></div><div><span>04 / JANGAN TEBAK</span><h2>BOLEH BELUM TAHU.</h2><p>Jika hanya tahu tahunnya, tulis tahunnya saja. Kalau masih perkiraan, beri tanda. Data yang jujur lebih kuat daripada data yang terdengar lengkap.</p></div></div><div class="guide-cta"><h2>PUNYA SEBUAH<br><em>CERITA?</em></h2><a href="/kontribusi" class="btn-ink">BUAT DRAF KONTRIBUSI ${icon('arrowUp', 19)}</a></div></div></section>`;
}
function aboutPage() {
  return `<section class="about-hero"><div class="site-container">${eyebrow('MANIFESTO / 00', 'KENALI NOISEANTARA', true)}<h1>BUNYI BOLEH<br>BERLALU.<br><em>JEJAKNYA JANGAN.</em></h1><div class="about-hero-bottom"><p>Noiseantara adalah rancangan arsip digital untuk musik underground dan DIY Indonesia, dimulai dari Jawa Timur.</p><span>NOISE = SUARA <br>ANTARA = RUANG BERSAMA</span></div></div></section><section class="about-manifesto section-cream"><div class="site-container"><div class="about-lead">${eyebrow('MENGAPA KAMI ADA', 'INGATAN YANG RAPUH')}<p>Sejarah sebuah scene sering tersebar di rak kaset, flyer kusut, blog yang mati, dan ingatan orang-orang yang pernah ada di dalamnya. Tanpa tempat untuk merangkainya, jejak itu mudah menghilang.</p></div><div class="values-list"><div><span>01</span><h2>AKURASI DI ATAS KECEPATAN.</h2><p>Kami lebih memilih “belum diketahui” daripada detail yang terlihat rapi tetapi keliru.</p></div><div><span>02</span><h2>SUMBER SELALU TERLIHAT.</h2><p>Setiap entri seharusnya menyebut asal informasi, tingkat kepastian, serta revisinya.</p></div><div><span>03</span><h2>KREDIT MENGIKUTI KONTRIBUSI.</h2><p>Pengetahuan kolektor, pelaku, dan komunitas tak boleh dilepas dari namanya.</p></div><div><span>04</span><h2>BUKAN ALGORITMA.</h2><p>Tak ada feed yang mengejar perhatian. Arsip ini dibangun untuk dibaca, diperiksa, dan dilengkapi.</p></div></div><div class="about-disclaimer">${demoNote()}<p>Prototipe ini hanya menampilkan wajah publik aplikasi. Belum ada autentikasi, moderasi nyata, basis data, layanan pengiriman, atau legal policy final. Peluncuran publik harus melewati review hukum dan checklist kesiapan produk.</p></div></div></section><section class="contribute-cta"><div class="site-container contribute-cta-inner"><span class="cta-asterisk" aria-hidden="true">✳</span><div><p class="mono-label">INGATAN ITU KERJA BERSAMA</p><h2>JANGAN BIARKAN<br><span>JEJAKNYA PUTUS.</span></h2></div><a href="/kontribusi" class="cta-circle" aria-label="Buat draf kontribusi">${icon('arrowUp', 35)}<span>MULAI<br>SEKARANG</span></a></div></section>`;
}
const infoPages = {
  '/kebijakan': { eyebrow: 'KEBIJAKAN KONTEN', title: 'RAWAT ARSIP.<br><em>HORMATI HAK.</em>', intro: 'Metadata historis, gambar, lirik, dan audio memiliki aturan yang berbeda. Ini ringkasan desain kebijakan, bukan dokumen hukum final.', sections: [ ['Audio & lirik', 'Tanpa izin eksplisit, tidak ada audio penuh yang dihosting atau diputar. Lirik penuh juga tidak ditampilkan tanpa izin tercatat; kutipan mengikuti pembatasan.'], ['Hak cipta & pengaduan', 'Pemegang hak bisa mengajukan koreksi atau penarikan. Pada produk final, permintaan dilacak dan diproses sesuai prosedur yang ditinjau hukum.'], ['Ketepatan sejarah', 'Informasi yang belum pasti ditandai. Perubahan data seharusnya meninggalkan riwayat, bukan menghapus jejak sebelumnya.'] ] },
  '/privasi': { eyebrow: 'PRIVASI', title: 'ARSIP TERBUKA.<br><em>DATA PRIBADI DIJAGA.</em>', intro: 'Prototipe ini tidak memiliki server akun atau analitik pihak ketiga. Draf kontribusi dan daftar tersimpan hanya berada di penyimpanan perambanmu.', sections: [ ['Yang tersimpan saat demo', 'Jika kamu memakai formulir kontribusi, teks draf tersimpan di localStorage perangkat ini. Gambar yang dipilih hanya dipratinjau sementara dan tidak disimpan. Daftar bacaan juga lokal.'], ['Cara menghapus', 'Hapus data situs Noiseantara dari pengaturan peramban, atau hapus item tersimpan satu per satu. Tidak ada pengiriman ke server dalam prototipe ini.'], ['Sebelum peluncuran', 'Kebijakan privasi final wajib menjelaskan pengendali data, dasar pemrosesan, retensi, hak subjek data, serta prosesor layanan; seluruhnya harus direview secara hukum.'] ] },
  '/ketentuan': { eyebrow: 'KETENTUAN', title: 'ATURAN MAIN<br><em>YANG ADIL.</em>', intro: 'Rangkuman konsep ketentuan kontribusi. Belum merupakan Terms of Service yang berlaku.', sections: [ ['Data faktual', 'Rancangan lisensi produk: fakta dan metadata arsip diperlakukan terbuka (CC0), agar bisa dipelajari dan dikutip.'], ['Teks & narasi', 'Rancangan lisensi teks naratif: CC BY-SA 4.0 dengan atribusi. Media visual dan audio tidak otomatis dilisensikan melalui kontribusi metadata.'], ['Moderasi sebelum tayang', 'Dalam produk final, usulan kontribusi tidak langsung menerbitkan perubahan. Kurator memeriksa sumber, hak penggunaan media, dan kriteria inklusi terlebih dahulu.'] ] },
  '/aksesibilitas': { eyebrow: 'AKSESIBILITAS', title: 'ARSIP INI<br><em>UNTUK SEMUA.</em>', intro: 'Antarmuka dirancang untuk digunakan dengan keyboard, pembaca layar, dan perangkat mobile—tanpa mengorbankan karakter visualnya.', sections: [ ['Yang ada di prototipe', 'Navigasi keyboard, skip link, label formulir, fokus terlihat, gambar dengan teks alternatif, serta preferensi reduced motion didukung.'], ['Yang perlu diaudit', 'Sebelum rilis produksi, seluruh alur perlu diuji lagi terhadap WCAG 2.1 AA menggunakan perangkat nyata dan pembaca layar.'], ['Lapor hambatan', 'Jika antarmuka sulit dipakai, simpan catatan halaman dan masalah yang kamu temui. Jalur laporan sesungguhnya akan tersedia saat layanan backend aktif.'] ] },
  '/donasi': { eyebrow: 'DUKUNG ARSIP', title: 'ARSIP HIDUP<br><em>KARENA ORANG.</em>', intro: 'Donasi publik belum aktif di prototipe ini. Kontribusi paling berguna sekarang adalah perhatian, sumber, dan cerita yang bisa diverifikasi.', sections: [ ['Mulai dari satu entri', 'Punya kaset atau foto flyer? Susun draf catatan dengan sumber dan kredit pemilik koleksi.'], ['Kerja jangka panjang', 'Sebelum donasi sungguhan dibuka, tata kelola hukum dan laporan penggunaan dana harus disiapkan secara transparan.'] ] },
  '/tentang/kredit': { eyebrow: 'TIM & KREDIT', title: 'DI BALIK ARSIP<br><em>ADA ORANG.</em>', intro: 'Kredit seharusnya mengikuti karya dan kontribusi; halaman ini memperlihatkan bentuk pengakuan yang direncanakan.', sections: [ ['Kontributor', 'Setiap entri final akan mengakui orang yang menyumbang data, sumber, pemindaian, dan koreksi. Nama di prototipe ini seluruhnya fiktif.'], ['Ilustrasi', 'Artwork rilisan dan foto suasana dibuat khusus sebagai ilustrasi prototipe; bukan scan kaset, foto peristiwa, atau dokumentasi sejarah.'], ['Pendiri & kurator', 'Identitas tim, prosedur kurasi, dan kontak legal perlu difinalkan sebelum peluncuran publik.'] ] },
  '/lisensi-konten': { eyebrow: 'LISENSI KONTEN', title: 'BERBAGI DATA.<br><em>MENJAGA HAK.</em>', intro: 'Berikut ringkasan rancangan lisensi dalam PRD. Naskah resmi harus direview hukum terlebih dahulu.', sections: [ ['Metadata', 'Fakta dan metadata diarahkan menjadi data terbuka di bawah CC0.'], ['Narasi', 'Bio, deskripsi, dan artikel dirancang memakai lisensi CC BY-SA 4.0 dengan atribusi.'], ['Media', 'Foto, sampul, flyer, dan audio tetap mengikuti izin masing-masing pemegang hak; tidak masuk lisensi metadata secara otomatis.'] ] },
  '/kode-etik': { eyebrow: 'KODE ETIK', title: 'SCENE BERBEDA.<br><em>SALING HORMAT.</em>', intro: 'Arsip yang baik bukan tempat untuk menyerang orang. Kebijakan komunitas final perlu ditulis bersama dan direview sebelum go-live.', sections: [ ['Bicara berdasarkan sumber', 'Pisahkan kesaksian, interpretasi, dan fakta yang bisa diperiksa. Hormati adanya perbedaan ingatan.'], ['Jaga martabat orang', 'Jangan mengunggah data pribadi yang tidak publik, fitnah, atau foto tanpa dasar penggunaan yang layak.'], ['Terima koreksi', 'Setiap klaim dapat diperiksa ulang. Jejak perubahan harus dicatat dan alasan keputusan dijelaskan.'] ] }
};
function infoPage(config) {
  return `${pageIntro('CATATAN PUBLIK', config.eyebrow, config.title, config.intro, { dark: true })}<section class="section-cream info-page"><div class="site-container"><div class="info-page-grid"><aside>${icon('alert', 28)}<strong>RANCANGAN,<br>BUKAN NASKAH FINAL.</strong><p>Dokumen legal dan operasional wajib menjalani review sebelum layanan dibuka untuk publik.</p></aside><div><div class="info-list">${config.sections.map(([title, copy], i) => `<section><span>0${i + 1} / CATATAN</span><h2>${esc(title)}</h2><p>${esc(copy)}</p></section>`).join('')}</div><a href="/tentang" class="btn-ink">TENTANG NOISEANTARA ${icon('arrowUp', 18)}</a></div></div></div></section>`;
}
function notFoundPage() {
  return `<section class="not-found"><div class="site-container"><p class="mono-label">404 / HALAMAN BELUM TERCATAT</p><h1>JEJAKNYA<br>BELUM <em>KETEMU.</em></h1><p>Pranala ini belum ada di prototipe. Coba telusuri arsip dari awal.</p><a href="/" class="btn-acid">KEMBALI KE BERANDA ${icon('arrowUp', 19)}</a></div></section>`;
}

const extra = createExtraPages({ esc, enc, icon, eyebrow, pageIntro, breadcrumbs, demoNote, releaseCard, artistCard, emptyState, slugify, genres: GENRES, captureLink });

let currentCitationSlug = null;
let currentCitationFormat = 'apa';
let contributionStep = 0;
let searchTimer = null;
let draftTimer = null;
let toastTimer = null;

function resolveRoute() {
  const path = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  if (path === '/') return { body: homePage(), title: 'Yang bising tak boleh hilang', active: '' };
  if (path === '/jelajah') return { body: extra.explorePage(), title: 'Peta jelajah arsip', active: '' };
  if (path === '/gig') return { body: extra.gigsPage(), title: 'Arsip gig & flyer', active: 'gig' };
  if (path === '/zine') return { body: extra.zinesPage(), title: 'Arsip zine', active: 'zine' };
  if (path === '/linimasa') return { body: extra.timelinePage(), title: 'Linimasa arsip', active: '' };
  if (path === '/statistik') return { body: extra.statsPage(), title: 'Statistik data demonstrasi', active: '' };
  if (path === '/dibutuhkan') return { body: extra.needsPage(), title: 'Yang belum terdokumentasi', active: '' };
  if (path === '/genre') return { body: extra.genresPage(), title: 'Indeks genre', active: '' };
  if (path === '/rilisan') return { body: releasesPage(), title: 'Jelajahi rilisan', active: 'rilisan' };
  if (path === '/artis') return { body: artistsPage(), title: 'Jelajahi artis', active: 'artis' };
  if (path === '/label') return { body: labelsPage(), title: 'Jelajahi label', active: 'label' };
  if (path === '/scene') return { body: scenesPage(), title: 'Scene per kota', active: 'scene' };
  if (path === '/pustaka') return { body: articlesPage(), title: 'Pustaka', active: 'pustaka' };
  if (path === '/cari') return { body: searchPage(), title: 'Pencarian arsip', active: '' };
  if (path === '/tersimpan') return { body: savedPage(), title: 'Tersimpan untuk nanti', active: '' };
  if (path === '/kontribusi/panduan') return { body: guidePage(), title: 'Panduan kontribusi', active: '' };
  if (path === '/kontribusi') return { body: contributionPage(), title: 'Buat draf kontribusi', active: '' };
  if (path === '/tentang') return { body: aboutPage(), title: 'Tentang Noiseantara', active: '' };
  if (infoPages[path]) return { body: infoPage(infoPages[path]), title: infoPages[path].eyebrow, active: '' };
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'gig' && parts.length === 2) { const gig = gigBySlug(parts[1]); if (gig) return { body: extra.gigDetailPage(gig), title: gig.title, active: 'gig' }; }
  if (parts[0] === 'zine' && parts[1]) {
    const zine = zineBySlug(parts[1]);
    if (zine && parts.length === 2) return { body: extra.zineDetailPage(zine), title: zine.name, active: 'zine' };
    if (zine && parts.length === 4 && parts[2] === 'isu') { const issue = issueBySlug(parts[1],parts[3]); if (issue) return { body: extra.issueDetailPage(zine,issue), title: `${zine.name} No. ${issue.number}`, active: 'zine' }; }
  }
  if (parts[0] === 'rilisan' && parts[1]) {
    const release = releaseBySlug(parts[1]);
    if (release && parts.length === 2) return { body: releaseDetailPage(release), title: `${release.title} — ${artistOf(release).name}`, active: 'rilisan' };
    if (release && parts[2] === 'riwayat' && parts.length === 3) return { body: historyPage(release), title: `Riwayat ${release.title}`, active: 'rilisan' };
    if (release && parts[2] === 'versi' && parts[3] === '1' && parts.length === 4) return { body: historyPage(release, true), title: `Versi 1 — ${release.title}`, active: 'rilisan' };
  }
  if (parts[0] === 'artis' && parts.length === 2) { const artist = artistBySlug(parts[1]); if (artist) return { body: artistDetailPage(artist), title: artist.name, active: 'artis' }; }
  if (parts[0] === 'label' && parts.length === 2) { const label = labelBySlug(parts[1]); if (label) return { body: labelDetailPage(label), title: label.name, active: 'label' }; }
  if (parts[0] === 'scene' && parts.length === 2) { const city = cityBySlug(parts[1]); if (city) return { body: sceneDetailPage(city), title: `Scene ${city.name}`, active: 'scene' }; }
  if (parts[0] === 'pustaka' && parts.length === 2) { const article = articleBySlug(parts[1]); if (article) return { body: articleDetailPage(article), title: article.title, active: 'pustaka' }; }
  if (parts[0] === 'genre' && parts.length === 2) { const genre = GENRES.find(item => slugify(item) === parts[1]); if (genre) return { body: genrePage(genre), title: `Genre ${genre}`, active: '' }; }
  return { body: notFoundPage(), title: 'Halaman tidak ditemukan', active: '' };
}
function cleanupOverlays() {
  document.querySelectorAll('.modal-backdrop,.offcanvas-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
}
function render({ scroll = false, hash = '' } = {}) {
  cleanupOverlays();
  const page = resolveRoute();
  app.innerHTML = shell(page.body, page.active);
  app.classList.add('hydrated');
  document.title = `${page.title} | Noiseantara`;
  document.querySelector('meta[name="description"]').setAttribute('content', `${page.title} — prototipe arsip musik underground Jawa Timur. Seluruh entri merupakan data demonstrasi.`);
  initPage();
  if (hash) { requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  else if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  updateScrollUI();
}
function navigate(url, replace = false) {
  const next = new URL(url, location.origin);
  if (next.origin !== location.origin) return;
  const samePage = next.pathname === location.pathname && next.search === location.search && !!next.hash;
  if (samePage) { history.pushState({}, '', next.pathname + next.search + next.hash); document.getElementById(next.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  history[replace ? 'replaceState' : 'pushState']({}, '', next.pathname + next.search + next.hash);
  render({ scroll: true, hash: next.hash });
}
function initPage() {
  const form = document.querySelector('#contributionForm');
  if (form) { contributionStep = 0; restoreDraft(); updateContributionUI(); }
  if (document.querySelector('.article-detail')) document.body.classList.add('has-article');
  else document.body.classList.remove('has-article', 'reader-mode');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }); }, { threshold: .08, rootMargin: '0px 0px 40px 0px' });
    document.querySelectorAll('.featured-grid > *, .section-heading, .manifesto-copy, .scene-row, .article-card, .values-list > div').forEach(el => { el.classList.add('reveal'); observer.observe(el); });
  }
  const searchModal = document.getElementById('searchModal');
  searchModal?.addEventListener('shown.bs.modal', () => document.getElementById('siteSearchInput')?.focus());
  const searchInput = document.getElementById('siteSearchInput');
  searchInput?.addEventListener('keydown', onSearchKeydown);
}

function showToast(message) {
  const el = document.getElementById('siteToast');
  const text = document.getElementById('siteToastText');
  if (!el || !text) return;
  text.textContent = message;
  clearTimeout(toastTimer);
  if (window.bootstrap?.Toast) window.bootstrap.Toast.getOrCreateInstance(el, { delay: 3600 }).show();
  else { el.classList.add('show'); toastTimer = setTimeout(() => el.classList.remove('show'), 3600); }
}
async function copyText(text, message = 'Tautan berhasil disalin.') {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.append(input); input.select();
      if (!document.execCommand('copy')) throw new Error('Copy gagal');
      input.remove();
    }
    showToast(message);
  } catch { showToast('Tidak bisa menyalin otomatis. Pilih teks lalu salin secara manual.'); }
}
function citationFor(release, format) {
  const title = release.title;
  const artist = artistOf(release).name;
  const url = `${location.origin}/rilisan/${release.slug}/versi/1`;
  switch (format) {
    case 'mla': return `“${title}.” Noiseantara, versi 1, 24 September 2026, ${url}. Data demonstrasi.`;
    case 'footnote': return `Noiseantara, “${title}” (${artist}), versi 1, 24 September 2026, ${url}. [Entri demonstrasi]`;
    case 'bibtex': return `@misc{noiseantara_${release.slug.replace(/-/g, '_')}_v1,\n  title = {${title} (Entri Demonstrasi)},\n  author = {{Noiseantara}},\n  year = {2026},\n  note = {Versi 1, data demonstrasi},\n  url = {${url}}\n}`;
    default: return `Noiseantara. (2026, 24 September). ${title} (${artist}) [Entri demonstrasi, versi 1]. ${url}`;
  }
}
function updateCitation() {
  const release = releaseBySlug(currentCitationSlug);
  if (!release) return;
  const output = document.getElementById('citationText');
  if (output) output.textContent = citationFor(release, currentCitationFormat);
  document.querySelectorAll('[data-citation-format]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.citationFormat === currentCitationFormat);
    btn.setAttribute('aria-pressed', String(btn.dataset.citationFormat === currentCitationFormat));
  });
}
function openModal(id) { const el = document.getElementById(id); if (el && window.bootstrap?.Modal) window.bootstrap.Modal.getOrCreateInstance(el).show(); }
function updateSavedUI() {
  document.querySelectorAll('[data-saved-count]').forEach(node => node.textContent = saved().length);
  document.querySelectorAll('[data-action="bookmark"]').forEach(button => {
    const release = releaseBySlug(button.dataset.slug);
    const active = isSaved(button.dataset.slug);
    button.classList.toggle('is-saved', active);
    button.setAttribute('aria-pressed', String(active));
    if (release) button.setAttribute('aria-label', `${active ? 'Hapus dari' : 'Simpan ke'} daftar bacaan: ${release.title}`);
    const label = button.querySelector('.save-label');
    if (label) label.textContent = active ? 'TERSIMPAN' : 'SIMPAN';
  });
}
function setReleaseFilter(name, value, push = false) {
  const map = { q: 'q', city: 'kota', genre: 'genre', decade: 'dekade', type: 'jenis', format: 'format', sort: 'urut', view: 'tampilan', page: 'halaman' };
  const p = new URLSearchParams(location.search);
  const key = map[name];
  if (!key) return;
  if (value && !((key === 'urut' && value === 'terbaru') || (key === 'tampilan' && value === 'grid') || (key === 'halaman' && value === '1'))) p.set(key, value);
  else p.delete(key);
  if (name !== 'page') p.delete('halaman');
  history[push ? 'pushState' : 'replaceState']({}, '', `/rilisan${p.size ? '?' + p.toString() : ''}`);
  const results = document.getElementById('releaseResults');
  if (results) results.innerHTML = releaseResultMarkup(releaseFilters());
  if (name === 'page') document.getElementById('releaseResults')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setExtraFilter(type, key, value) {
  const config = {
    gig: ['/gig', 'gigResults', extra.gigResults],
    zine: ['/zine', 'zineResults', extra.zineResults],
    need: ['/dibutuhkan', 'needsResults', extra.needsResults]
  }[type];
  if (!config) return;
  const [path, id, draw] = config;
  const p = new URLSearchParams(location.search);
  if (value && !(key === 'urut' && value === 'terbaru')) p.set(key, value);
  else p.delete(key);
  history.replaceState({}, '', path + (p.size ? `?${p}` : ''));
  const results = document.getElementById(id);
  if (results) results.innerHTML = draw();
}
function suggestionMarkup(query) {
  const result = getSearchResults(query).slice(0, 10);
  if (!query.trim()) return `<div class="search-hint">Coba cari <button type="button" data-action="search-example" data-query="Rongga">Rongga</button>, <button type="button" data-action="search-example" data-query="tipe:gig">tipe:gig</button>, atau <button type="button" data-action="search-example" data-query="kota:Malang">kota:Malang</button>.</div>`;
  if (!result.length) return `<div class="search-empty">Belum ada yang cocok dengan <strong>“${esc(query)}”</strong>.<a href="/cari?q=${enc(query)}">Lihat halaman pencarian ${icon('arrow', 16)}</a></div>`;
  let optionIndex = 0;
  return ['Artis', 'Rilisan', 'Gig', 'Zine', 'Label', 'Scene', 'Pustaka', 'Kebutuhan'].map(type => {
    const items = result.filter(item => item.type === type);
    if (!items.length) return '';
    return `<div class="suggestion-group" role="group" aria-label="${type}"><div class="suggestion-caption">${esc(type.toUpperCase())} / ${items.length}</div>${items.map(item => `<a href="${item.url}" role="option" id="search-option-${optionIndex++}" aria-selected="false" class="suggestion-item" data-suggestion><span class="suggestion-thumb">${item.cover ? `<img src="${coverPath(item.cover, true)}" alt="" width="42" height="42">` : icon(type === 'Scene' ? 'pin' : 'disc', 20)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span>${icon('arrowUp', 18)}</a>`).join('')}</div>`;
  }).join('');
}
function updateSearchSuggestions() {
  const input = document.getElementById('siteSearchInput');
  const results = document.getElementById('searchResults');
  const all = document.getElementById('searchAllLink');
  if (!input || !results) return;
  results.innerHTML = suggestionMarkup(input.value);
  input.setAttribute('aria-expanded', String(!!input.value.trim() && getSearchResults(input.value).length > 0));
  input.removeAttribute('aria-activedescendant');
  if (all) all.href = `/cari?q=${enc(input.value.trim())}`;
}
function onSearchKeydown(e) {
  const input = e.currentTarget;
  const options = [...document.querySelectorAll('#searchResults [data-suggestion]')];
  const current = options.findIndex(el => el.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!options.length) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1);
    options.forEach((item, i) => item.setAttribute('aria-selected', String(i === next)));
    input.setAttribute('aria-activedescendant', options[next].id);
    options[next].scrollIntoView({ block: 'nearest' });
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (current >= 0 && options[current]) navigate(options[current].getAttribute('href'));
    else navigate(`/cari?q=${enc(input.value.trim())}`);
  }
}

function addTrack(value = '') {
  const rows = document.getElementById('trackRows');
  if (!rows || rows.children.length >= 25) return;
  const index = rows.children.length + 1;
  const row = document.createElement('div');
  row.className = 'track-input-row';
  row.innerHTML = `<span>${String(index).padStart(2, '0')}</span><input type="text" name="trackTitle" maxlength="120" class="form-control form-control-n" placeholder="Judul lagu" value="${esc(value)}"><button type="button" data-action="remove-track" aria-label="Hapus lagu ${index}">${icon('close', 16)}</button>`;
  rows.append(row);
}
function renumberTracks() {
  document.querySelectorAll('#trackRows .track-input-row').forEach((row, i) => {
    row.querySelector('span').textContent = String(i + 1).padStart(2, '0');
    row.querySelector('button').disabled = document.querySelectorAll('#trackRows .track-input-row').length <= 1;
    row.querySelector('button').setAttribute('aria-label', `Hapus lagu ${i + 1}`);
  });
}
function draftData() {
  const form = document.getElementById('contributionForm');
  if (!form) return null;
  const names = ['releaseTitle', 'releaseArtist', 'releaseCity', 'releaseYear', 'releasePrecision', 'releaseType', 'releaseFormat', 'releaseNotes', 'mediaAlt', 'mediaCredit', 'mediaBasis', 'sourceType', 'sourceDescription', 'sourceUrl'];
  const data = Object.fromEntries(names.map(name => [name, form.elements[name]?.value || '']));
  data.tracks = [...form.querySelectorAll('input[name="trackTitle"]')].map(input => input.value);
  data.step = contributionStep;
  data.savedAt = Date.now();
  return data;
}
function saveDraft(silent = true) {
  const data = draftData();
  if (!data) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    const status = document.getElementById('draftStatus');
    if (status) status.textContent = `TERSIMPAN ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    if (!silent) showToast('Draf tersimpan di perangkat ini. Belum dikirim ke kurator.');
  } catch { showToast('Penyimpanan perangkat penuh atau dinonaktifkan. Salin catatanmu secara manual.'); }
}
function restoreDraft() {
  let data;
  try { data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { data = null; }
  if (!data) return;
  const form = document.getElementById('contributionForm');
  Object.entries(data).forEach(([key, value]) => { if (form.elements[key] && typeof value === 'string') form.elements[key].value = value; });
  if (Array.isArray(data.tracks) && data.tracks.length) {
    const first = document.querySelector('#trackRows input[name="trackTitle"]');
    if (first) first.value = data.tracks[0];
    data.tracks.slice(1, 25).forEach(title => addTrack(title));
    renumberTracks();
  }
  contributionStep = Math.max(0, Math.min(3, Number(data.step) || 0));
  const status = document.getElementById('draftStatus');
  if (status) status.textContent = 'DRAF DIPULIHKAN';
}
function formError(message, field = null) {
  const box = document.getElementById('formError');
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
  field?.focus();
}
function validateStep(step) {
  const form = document.getElementById('contributionForm');
  if (!form) return false;
  const required = step === 0 ? ['releaseTitle', 'releaseArtist', 'releaseCity', 'releaseType', 'releaseFormat'] : step === 2 ? ['sourceType', 'sourceDescription'] : [];
  for (const key of required) {
    const field = form.elements[key];
    if (!field.value.trim()) { formError(`Isi ${field.closest('.form-field')?.querySelector('label')?.textContent?.replace('*', '').trim().toLowerCase() || 'bagian wajib'} sebelum lanjut.`, field); return false; }
  }
  const year = form.elements.releaseYear;
  if (step === 0 && year.value && !year.checkValidity()) { formError('Tahun rilis harus antara 1960 dan 2026.', year); return false; }
  if (step === 0 && year.value && form.elements.releasePrecision.value === 'tidak diketahui') { formError('Pilih ketepatan tahun rilis: tahun pasti atau perkiraan.', form.elements.releasePrecision); return false; }
  const media = document.getElementById('releaseMedia');
  if (step === 1 && media.files?.length) {
    for (const key of ['mediaAlt', 'mediaCredit', 'mediaBasis']) if (!form.elements[key].value.trim()) { formError('Jika menambahkan gambar, isi deskripsi gambar, kredit, dan dasar penggunaannya.', form.elements[key]); return false; }
  }
  if (step === 2 && form.elements.sourceUrl.value && !form.elements.sourceUrl.checkValidity()) { formError('Pranala sumber harus berupa URL yang valid, dimulai dengan https://.', form.elements.sourceUrl); return false; }
  return true;
}
function updateContributionUI() {
  document.querySelectorAll('.form-step').forEach((el, i) => el.classList.toggle('active', i === contributionStep));
  document.querySelectorAll('[data-step-go]').forEach((button, i) => {
    button.classList.toggle('active', i === contributionStep);
    button.classList.toggle('completed', i < contributionStep);
    if (i === contributionStep) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  const back = document.getElementById('stepBack');
  const next = document.getElementById('stepNext');
  const save = document.getElementById('saveDraft');
  if (back) back.hidden = contributionStep === 0;
  if (next) next.hidden = contributionStep === 3;
  if (save) save.hidden = contributionStep !== 3;
  const error = document.getElementById('formError');
  if (error) { error.hidden = true; error.textContent = ''; }
  if (contributionStep === 3) updateDraftPreview();
}
function changeStep(next) {
  if (next > contributionStep) {
    for (let i = contributionStep; i < next; i++) if (!validateStep(i)) return;
  }
  contributionStep = Math.max(0, Math.min(3, next));
  updateContributionUI();
  saveDraft();
  document.querySelector('.form-card-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function updateDraftPreview() {
  const box = document.getElementById('draftPreview');
  const data = draftData();
  if (!box || !data) return;
  const tracks = data.tracks.filter(Boolean);
  box.innerHTML = `<div><span>JUDUL</span><strong>${esc(data.releaseTitle || '—')}</strong></div><div><span>ARTIS & KOTA</span><strong>${esc(data.releaseArtist || '—')} / ${esc(cityName(data.releaseCity))}</strong></div><div><span>TAHUN / KETEPATAN</span><strong>${esc(data.releaseYear || 'Belum diketahui')} · ${esc(data.releasePrecision)}</strong></div><div><span>JENIS / FORMAT</span><strong>${esc(data.releaseType || '—')} / ${esc(data.releaseFormat || '—')}</strong></div><div><span>LAGU</span><strong>${tracks.length ? tracks.map((t, i) => `${i + 1}. ${esc(t)}`).join('<br>') : 'Belum dicatat'}</strong></div><div><span>SUMBER</span><strong>${esc(data.sourceType || '—')} — ${esc(data.sourceDescription || '—')}</strong></div><div><span>GAMBAR</span><strong>${document.getElementById('releaseMedia')?.files?.length ? 'Dipilih untuk pratinjau; tidak tersimpan dalam draf' : 'Belum dipilih (diperlukan pada produk final)'}</strong></div>`;
}
function handleMedia(file) {
  const box = document.getElementById('imagePreview');
  if (!box) return;
  if (box.dataset.url) URL.revokeObjectURL(box.dataset.url);
  box.innerHTML = '';
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    document.getElementById('releaseMedia').value = '';
    formError('Gambar harus JPG, PNG, atau WebP dan berukuran maksimal 5 MB.', document.getElementById('releaseMedia'));
    return;
  }
  const url = URL.createObjectURL(file);
  box.dataset.url = url;
  box.innerHTML = `<img src="${url}" alt="Pratinjau gambar yang dipilih" width="90" height="90"><div><strong>${esc(file.name)}</strong><span>${(file.size / 1024 / 1024).toFixed(2)} MB · hanya pratinjau sementara</span></div><button type="button" data-action="clear-media" aria-label="Hapus gambar yang dipilih">${icon('close', 17)}</button>`;
  const error = document.getElementById('formError'); if (error) error.hidden = true;
}

// Internal links use History API; Bootstrap's offcanvas/modal is only presentation.
document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]');
  if (action) {
    switch (action.dataset.action) {
      case 'back-to-top': event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
      case 'bookmark': {
        const slug = action.dataset.slug;
        let list = saved();
        const wasSaved = list.includes(slug);
        list = wasSaved ? list.filter(id => id !== slug) : [...list, slug];
        try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { showToast('Penyimpanan peramban tidak tersedia.'); return; }
        if (location.pathname === '/tersimpan') render({ scroll: false });
        else updateSavedUI();
        showToast(wasSaved ? 'Rilisan dihapus dari daftar tersimpan.' : 'Rilisan disimpan di peramban ini.');
        return;
      }
      case 'city-preview': {
        const city = cityBySlug(action.dataset.city); if (!city) return;
        document.querySelectorAll('[data-action="city-preview"]').forEach(button => { button.classList.toggle('active', button === action); button.setAttribute('aria-pressed', String(button === action)); });
        const panel = document.getElementById('scenePreview');
        if (panel) { panel.style.setProperty('--city-accent', city.color); panel.innerHTML = scenePreview(city); }
        return;
      }
      case 'cite': currentCitationSlug = action.dataset.slug; currentCitationFormat = 'apa'; updateCitation(); openModal('citationModal'); return;
      case 'copy-citation': copyText(document.getElementById('citationText')?.textContent || '', 'Contoh sitasi disalin. Ingat: ini data demonstrasi.'); return;
      case 'show-cover': {
        document.getElementById('coverModalImage').src = coverPath(action.dataset.cover);
        document.getElementById('coverModalImage').alt = `Artwork ilustratif untuk ${action.dataset.title}`;
        document.getElementById('coverModalCaption').textContent = `${action.dataset.title} — ilustrasi orisinal prototipe; bukan scan artefak atau peristiwa historis.`;
        openModal('coverModal'); return;
      }
      case 'report': document.getElementById('reportUrl').textContent = `${location.pathname} · ${document.title}`; openModal('reportModal'); return;
      case 'copy-report': {
        const detail = document.getElementById('reportDetail').value.trim();
        const reason = document.getElementById('reportReason').value;
        copyText(`Laporan untuk ${location.href}\nJenis: ${reason}\nKeterangan: ${detail || '(belum diisi)'}\nCatatan: belum dikirim dari prototipe.`, 'Ringkasan tersalin. Laporan belum dikirim karena ini prototipe.'); return;
      }
      case 'share': {
        const url = new URL(action.dataset.url, location.origin).href;
        if (navigator.share) navigator.share({ title: action.dataset.title, url }).catch(() => {});
        else copyText(url, 'Tautan berhasil disalin.'); return;
      }
      case 'reader-mode': {
        const on = document.body.classList.toggle('reader-mode');
        action.setAttribute('aria-pressed', String(on));
        action.innerHTML = `${icon('book', 17)} ${on ? 'TUTUP MODE BACA' : 'MODE BACA'}`; return;
      }
      case 'print': window.print(); return;
      case 'reset-filters': event.preventDefault(); navigate('/rilisan', true); return;
      case 'reset-gigs': navigate('/gig', true); return;
      case 'reset-zines': navigate('/zine', true); return;
      case 'reset-needs': navigate('/dibutuhkan', true); return;
      case 'stats-set': {
        const set = action.dataset.set;
        document.querySelectorAll('[data-action="stats-set"]').forEach(button => { button.classList.toggle('active', button === action); button.setAttribute('aria-pressed', String(button === action)); });
        const chart = document.getElementById('statsChart');
        if (chart) { chart.innerHTML = extra.chartMarkup(set); chart.setAttribute('aria-label', `Grafik jumlah ${set === 'zine' ? 'isu zine' : set} contoh per dekade`); }
        return;
      }
      case 'view': setReleaseFilter('view', action.dataset.view); return;
      case 'page': setReleaseFilter('page', action.dataset.page, true); return;
      case 'search-example': {
        const input = document.getElementById('siteSearchInput');
        if (input) { input.value = action.dataset.query; updateSearchSuggestions(); input.focus(); } return;
      }
      case 'step-next': changeStep(contributionStep + 1); return;
      case 'step-back': changeStep(contributionStep - 1); return;
      case 'save-draft': saveDraft(false); return;
      case 'add-track': addTrack(); renumberTracks(); saveDraft(); return;
      case 'remove-track': action.closest('.track-input-row')?.remove(); renumberTracks(); saveDraft(); return;
      case 'clear-media': {
        const box = document.getElementById('imagePreview');
        if (box?.dataset.url) URL.revokeObjectURL(box.dataset.url);
        if (box) { box.innerHTML = ''; delete box.dataset.url; }
        const input = document.getElementById('releaseMedia'); if (input) input.value = '';
        return;
      }
    }
  }
  const citationTab = event.target.closest('[data-citation-format]');
  if (citationTab) { currentCitationFormat = citationTab.dataset.citationFormat; updateCitation(); return; }
  const stepButton = event.target.closest('[data-step-go]');
  if (stepButton) { changeStep(Number(stepButton.dataset.stepGo)); return; }
  const anchor = event.target.closest('a[href]');
  if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('data-native-nav') || anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return;
  event.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

document.addEventListener('input', event => {
  if (event.target.id === 'siteSearchInput') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(updateSearchSuggestions, 250);
  }
  if (event.target.matches('[data-filter="q"]') && location.pathname === '/rilisan') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setReleaseFilter('q', event.target.value), 220);
  }
  if (event.target.matches('[data-gig-filter="q"], [data-zine-filter="q"]')) {
    const target = event.target;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setExtraFilter(target.hasAttribute('data-gig-filter') ? 'gig' : 'zine', 'q', target.value.trim()), 240);
  }
  if (event.target.closest('#contributionForm')) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(), 650);
  }
});
document.addEventListener('change', event => {
  if (event.target.matches('[data-filter]') && event.target.dataset.filter !== 'q' && location.pathname === '/rilisan') setReleaseFilter(event.target.dataset.filter, event.target.value);
  if (event.target.matches('[data-gig-filter]:not([data-gig-filter="q"])')) setExtraFilter('gig', event.target.dataset.gigFilter, event.target.value);
  if (event.target.matches('[data-zine-filter]:not([data-zine-filter="q"])')) setExtraFilter('zine', event.target.dataset.zineFilter, event.target.value);
  if (event.target.matches('[data-need-filter]')) setExtraFilter('need', event.target.dataset.needFilter, event.target.value);
  if (event.target.id === 'releaseMedia') handleMedia(event.target.files?.[0]);
  if (event.target.id === 'releaseYear') {
    const precision = document.getElementById('releasePrecision');
    if (precision && event.target.value && precision.value === 'tidak diketahui') precision.value = 'tahun';
  }
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id === 'contributionForm') { event.preventDefault(); changeStep(contributionStep + 1); return; }
  if (form.matches('form[action="/gig"], form[action="/zine"]')) {
    event.preventDefault();
    const entries = new URLSearchParams([...new FormData(form)].filter(([,value]) => value));
    navigate(`${form.getAttribute('action')}${entries.size ? `?${entries}` : ''}`);
    return;
  }
  if (form.matches('form[action="/cari"], form[action="/artis"]')) {
    event.preventDefault();
    const q = new FormData(form).get('q')?.toString().trim() || '';
    navigate(`${form.getAttribute('action')}${q ? `?q=${enc(q)}` : ''}`);
  }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openModal('searchModal');
  }
});
window.addEventListener('popstate', () => render({ scroll: true, hash: location.hash }));
function updateScrollUI() {
  document.querySelector('.back-top')?.classList.toggle('visible', window.scrollY > 900);
  const bar = document.getElementById('readingProgress');
  const article = document.querySelector('.article-content-wrap');
  if (bar) {
    if (!article) { bar.style.width = '0%'; return; }
    const start = article.getBoundingClientRect().top + window.scrollY;
    const end = start + article.offsetHeight - window.innerHeight;
    const percent = end > start ? Math.min(100, Math.max(0, (window.scrollY - start) / (end - start) * 100)) : 100;
    bar.style.width = `${percent}%`;
  }
}
window.addEventListener('scroll', updateScrollUI, { passive: true });
render({ hash: location.hash });
