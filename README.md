# Noiseantara — Demo Statis Publik

Situs statis hasil export seluruh halaman publik Noiseantara per **26 Sep 2026**
(**163 halaman**, data asli database). Siap diunggah ke hosting
gratis seperti GitHub Pages — tanpa server, tanpa database, tanpa build.

## Cara pasang (GitHub Pages)

1. Buat repository **baru** (public), mis. `noiseantara-demo`.
2. Unggah **isi folder ini** ke branch `main` (drag-and-drop lewat web
   GitHub bisa: Add file → Upload files).
3. Buka **Settings → Pages → Build and deployment**:
   Source = **Deploy from a branch**, Branch = **main**, folder = **/(root)**.
4. Buka URL `https://USERNAME.github.io/noiseantara-demo/`.

> Custom domain opsional via Settings → Pages → Custom domain.

## Isi

- `index.html` — beranda; `rilisan/`, `artis/`, `gig/`, `zine/`,
  `label/`, `scene/`, `pustaka/`, `genre/` — indeks + detail;
  `zine/{nama}-isu-{nomor}.html` — detail isu;
  `rilisan/{slug}-versi-{n}.html` — riwayat versi entri.
- `jelajah/`, `linimasa/`, `statistik/`, `dibutuhkan/`, `tentang/`,
  `donasi/`, `tersimpan/`, `capture/`, `cari/` (+ `capture.html`).
- `kebijakan/`, `privasi/`, `ketentuan/`, `aksesibilitas/`,
  `lisensi-konten/`, `kode-etik/`, `laporkan/`, `kontribusi/`.
- `assets/` (CSS/JS/font/gambar), `vendor/` (bootstrap),
  `js/` (interaksi), `media/` (sampul dari arsip),
  `data/search-index.json` (pencarian offline),
  `data/capture-db.json` (basis Capture Studio).

## Keterbatasan demo (disengaja & jujur)

- Formulir **kontribusi & laporkan** dinonaktifkan (toast penjelasan).
- **Login/daftar/dasbor** butuh server — diklik memunculkan penjelasan.
- **Filter** indeks menampilkan seluruh data (filter butuh server).
- **Pencarian** (`/cari`, saran ⌘K) berjalan **offline** dari indeks lokal.
- **Tersimpan** & **Capture Studio** penuh di peramban (localStorage +
  canvas) — bisa dicoba seperti aslinya.
- Halaman pelacakan kontribusi per token tidak disertakan (data pribadi).

## Regenerasi

```sh
php artisan demo:export --output=demo
```

Dirender ulang dari database saat itu juga (relasi `city` rilisan
diambil dari artis pertama — lihat `PageController::capture`).