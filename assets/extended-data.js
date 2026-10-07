


export const gigs = [
  { slug: 'di-bawah-jembatan-2003', title: 'Di Bawah Jembatan', year: 2003, date: 'Oktober 2003', precision: 'Perkiraan bulan', city: 'surabaya', venue: 'Ruang Bawah / lokasi ilustratif', flyer: 'flyer-bawah-jembatan', genres: ['Hardcore', 'Punk'], lineup: [{ artist: 'rongga-trotoar' }, { artist: 'garis-retak' }, { text: 'Penampil lain belum tercatat' }], summary: 'Satu malam, beberapa nama, dan sebuah flyer yang mengingatkan mengapa dokumentasi kecil berarti.', story: 'Dalam entri demonstrasi ini, flyer dipakai sebagai pintu masuk ke lineup, kota, dan artefak yang saling terkait. Tidak ada peristiwa nyata yang diklaim berlangsung di tanggal atau tempat ini.', source: 'Flyer ilustratif dibuat khusus untuk prototipe Noiseantara.' },
  { slug: 'frekuensi-yang-pecah-2006', title: 'Frekuensi yang Pecah', year: 2006, date: '2006', precision: 'Tahun', city: 'malang', venue: 'Ruang Eksperimen / ilustratif', flyer: 'flyer-frekuensi', genres: ['Noise', 'Eksperimental'], lineup: [{ artist: 'kamar-ambang' }, { artist: 'jalur-mati' }], summary: 'Jejak pertemuan bunyi eksperimental dalam satu lembar poster contoh.', story: 'Halaman gig dirancang agar peristiwa, flyer, dan pelakunya dapat ditemukan bersama. Keterangan di sini sepenuhnya berupa simulasi.', source: 'Flyer demonstrasi, bukan dokumen acara historis.' },
  { slug: 'malam-rongga-2012', title: 'Malam Rongga', year: 2012, date: 'Mei 2012', precision: 'Perkiraan bulan', city: 'jember', venue: 'Ruang Kolektif / ilustratif', flyer: 'flyer-malam-rongga', genres: ['Indie / DIY', 'Noise'], lineup: [{ artist: 'lorong-selatan' }, { artist: 'suara-muara' }], summary: 'Benda yang paling mudah hilang dari sebuah gig sering justru selembar kertasnya.', story: 'Dibangun sebagai contoh bagaimana ruang kolektif dan lineup bisa terhubung ke profil masing-masing artis.', source: 'Poster ilustratif untuk demonstrasi antarmuka.' },
  { slug: 'gema-tanpa-panggung-2004', title: 'Gema Tanpa Panggung', year: 2004, date: '2004', precision: 'Perkiraan tahun', city: 'kediri', venue: 'Lokasi belum terdokumentasi', flyer: 'flyer-gema-tanpa-panggung', genres: ['Grindcore', 'Hardcore'], lineup: [{ artist: 'saksi-bising' }, { text: 'Satu penampil belum terdokumentasi' }], summary: 'Ketidaklengkapan adalah alasan untuk membuka pintu kontribusi, bukan mengarang isinya.', story: 'Salah satu entri contoh sengaja menyisakan venue dan penampil yang belum diketahui untuk memperlihatkan kondisi arsip parsial.', source: 'Catatan simulasi, bukan sumber peristiwa nyata.' },
  { slug: 'mesin-dan-malapetaka-2008', title: 'Mesin dan Malapetaka', year: 2008, date: 'Agustus 2008', precision: 'Perkiraan bulan', city: 'sidoarjo', venue: 'Ruang Mesin / ilustratif', flyer: 'flyer-mesin-malapetaka', genres: ['Metal', 'Sludge'], lineup: [{ artist: 'pelat-berkarat' }, { artist: 'rongga-trotoar' }], summary: 'Dua frekuensi bertemu dalam contoh catatan pertunjukan lintas kota.', story: 'Kaitan antar-artis, kota, dan flyer pada contoh ini dirancang untuk menunjukkan struktur modul gig dalam antarmuka publik.', source: 'Flyer demonstrasi; seluruh detail panggung bersifat fiktif.' }
];

export const zines = [
  { slug: 'sisi-b', name: 'Sisi B', city: 'surabaya', period: '2002–2005', style: 'PUNK / CERITA DARI SAMPING', cover: 'zine-sisi-b', description: 'Zine fiktif yang memperlihatkan bagaimana catatan cetak mandiri bisa memiliki katalog isu, kredit, dan konteks kota.', issues: [
    { slug: '01', number: '01', year: 2003, pages: 24, cover: 'zine-sisi-b', summary: 'Edisi demonstrasi: sampul fotokopi, percakapan scene, dan catatan rilisan.', contents: [{ page: '02', title: 'Pengantar redaksi' }, { page: '06', title: 'Catatan dari ruang latihan' }, { page: '12', title: 'Tiga kaset dan satu malam' }, { page: '20', title: 'Halaman terakhir' }] },
    { slug: '02', number: '02', year: 2005, pages: 32, cover: 'zine-sisi-b-02', summary: 'Edisi kedua ilustratif tentang ingatan yang pindah dari tangan ke tangan.', contents: [{ page: '03', title: 'Sepucuk surat' }, { page: '09', title: 'Cerita di balik rak kaset' }, { page: '18', title: 'Daftar rilisan' }] }
  ] },
  { slug: 'fotokopi-tengah-malam', name: 'Fotokopi Tengah Malam', city: 'malang', period: '2005–2007', style: 'KASET / PERCAKAPAN / DIY', cover: 'zine-fotokopi', description: 'Publikasi contoh yang menjadikan potongan kaset, tulisan tangan, dan fotokopi sebagai bahasa visual.', issues: [
    { slug: '01', number: '01', year: 2006, pages: 20, cover: 'zine-fotokopi', summary: 'Contoh isi: pengantar, catatan tempat, dan halaman indeks.', contents: [{ page: '02', title: 'Pembuka' }, { page: '05', title: 'Dari kamar ke kaset' }, { page: '14', title: 'Catatan sebuah kota' }] }
  ] },
  { slug: 'distorsi-kecil', name: 'Distorsi Kecil', city: 'kediri', period: '2004–2008', style: 'EKSPERIMEN / ARSIP BUNYI', cover: 'zine-distorsi', description: 'Entri zine ilustratif yang menekankan hubungan halaman cetak dengan artis, gig, dan rilisan di arsip.', issues: [
    { slug: '01', number: '01', year: 2004, pages: 16, cover: 'zine-distorsi', summary: 'Edisi awal ilustratif: sketsa bunyi dan daftar pertanyaan untuk sebuah scene.', contents: [{ page: '02', title: 'Mengapa menulis?' }, { page: '07', title: 'Peta bunyi yang belum lengkap' }, { page: '13', title: 'Kredit & sumber' }] }
  ] }
];

export const needs = [
  { id: 'ARS-01', type: 'Rilisan', kind: 'Scan belakang', title: 'Fragmen Jalan Raya', city: 'surabaya', year: 1999, slug: 'fragmen-jalan-raya', why: 'Tracklist ada, tetapi artefak sampul belakang belum ditunjukkan dalam demo.', priority: 'TINGGI', icon: 'image' },
  { id: 'ARS-02', type: 'Artis', kind: 'Formasi personel', title: 'Pelat Berkarat', city: 'sidoarjo', year: 2006, slug: 'pelat-berkarat', why: 'Profil artis contoh ini belum memiliki catatan personel dan periode aktif.', priority: 'TINGGI', icon: 'layers' },
  { id: 'ARS-03', type: 'Gig', kind: 'Lokasi acara', title: 'Gema Tanpa Panggung', city: 'kediri', year: 2004, slug: 'gema-tanpa-panggung-2004', why: 'Lokasi belum terdokumentasi; sumber baru dibutuhkan untuk mengisi bagian ini.', priority: 'SEDANG', icon: 'pin' },
  { id: 'ARS-04', type: 'Rilisan', kind: 'Tautan dengar resmi', title: 'Bising di Bawah Tanah', city: 'surabaya', year: 2003, slug: 'bising-di-bawah-tanah', why: 'Belum ada tautan platform resmi per lagu. Tidak ada audio yang boleh dianggap tersedia tanpa izin.', priority: 'SEDANG', icon: 'headphones' },
  { id: 'ARS-05', type: 'Zine', kind: 'Halaman dalam', title: 'Distorsi Kecil', city: 'kediri', year: 2004, slug: 'distorsi-kecil', why: 'Sampul ada sebagai ilustrasi, tetapi belum ada scan halaman atau OCR yang terverifikasi.', priority: 'SEDANG', icon: 'book' },
  { id: 'ARS-06', type: 'Rilisan', kind: 'Edisi / cetakan', title: 'Tak Ada Panggung Terakhir', city: 'kediri', year: 2004, slug: 'tak-ada-panggung-terakhir', why: 'Detail cetakan dan jumlah salinan belum tersedia dalam data contoh.', priority: 'RENDAH', icon: 'disc' }
];

export const genreDescriptions = {
  'Hardcore': 'Keras dan segera, dengan banyak percabangan suara dan komunitasnya.',
  'Punk': 'Bukan hanya bunyi; ada cara membuat, membagikan, dan saling menjaga.',
  'Noise': 'Eksperimen frekuensi, tekstur, dan perhatian pada hal yang sering disebut gangguan.',
  'Metal': 'Riff berat dan kerja independen yang menghasilkan jejak rilisan beragam.',
  'Sludge': 'Lambat, pekat, dan tidak terburu-buru menjelaskan dirinya.',
  'Grindcore': 'Singkat dan intens; juga punya sejarah kecil yang perlu dicatat.',
  'Indie / DIY': 'Ruang bagi rilisan mandiri yang sulit ditempatkan dalam satu rak.',
  'Eksperimental': 'Saat bentuk yang lazim tak lagi cukup untuk memuat ide bunyinya.'
};

export const gigBySlug = slug => gigs.find(item => item.slug === slug);
export const zineBySlug = slug => zines.find(item => item.slug === slug);
export const issueBySlug = (zineSlug, issueSlug) => zineBySlug(zineSlug)?.issues.find(issue => issue.slug === issueSlug);
