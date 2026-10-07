/**
 * =============================================================================
 * NOISEANTARA - ENDPOINT KONTRIBUSI (Google Apps Script)
 * =============================================================================
 *
 * Halaman kontribusi pada demo statis GitHub Pages tidak punya server, jadi form
 * mengirim satu JSON ke web app ini. Tugasnya sempit:
 *
 *   1. Simpan isi pengiriman sebagai SATU BARIS di Google Sheet.
 *   2. Unggah foto/audio ke folder Drive, satu subfolder per pengiriman.
 *   3. Balas nomor referensi supaya pengisi bisa menyimpan buktinya.
 *
 * -----------------------------------------------------------------------------
 * CARA PAKAI (sekali saja)
 * -----------------------------------------------------------------------------
 *
 *  1. https://script.google.com -> "New project".
 *  2. Tempel file ini ke Code.gs, lalu isi KONFIGURASI di bawah.
 *  3. Buat Google Sheet kosong, ambil FILE_ID dari URL:
 *        https://docs.google.com/spreadsheets/d/{FILE_ID}/edit
 *  4. Buat folder Drive kosong, ambil FOLDER_ID dari URL:
 *        https://drive.google.com/drive/folders/{FOLDER_ID}
 *  5. Deploy -> New deployment -> tipe "Web app":
 *        Execute as       : Me
 *        Who has access  : Anyone      <-- WAJIB, bukan "Anyone with Google
 *                                           account". Kalau dibatasi, github.io
 *                                           mendapat 401 dan CORS gagal.
 *     Deploy, lalu salin URL berakhiran /exec.
 *  6. Tempel URL itu ke assets/kontribusi-config.js (ENDPOINT) di repo demo.
 *
 * -----------------------------------------------------------------------------
 * BATAS YANG HARUS DIJAWAB, BUKAN DIAM-DIAM
 * -----------------------------------------------------------------------------
 *
 *  - Batas POST web app Google sekitar 50 MB. Panjang payload base64 menambah
 *    33% dari ukuran berkas asli, jadi sisi klien memotong gambar dulu. Script
 *    ini tetap menolak yang kelebihan. Sisi klien juga memotong gambar lebih
 *    dulu supaya batas itu tidak pernahtersentuh.
 *  - Kuota harian consumer: 50.000 tulis spreadsheet per hari, jauh melebihi
 *    kebutuhan demo. Yang lebih membatasi adalah batas SEL per menit (300),
 *    jadi percobaan otomatis beruntun akan kena.
 *  - Drive konsumen 15 GB.
 *  - Script, Sheet, dan Drive mengikuti satu akun pribadi. Kalau akunnya hilang,
 *    seluruh arsip kontribusi ikut hilang.
 *
 * =============================================================================
 */

var KONFIGURASI = {
  /** FILE_ID Google Sheet tujuan. Kalau masih GANTI_, data hanya masuk script properties. */
  SPREADSHEET_ID: '13XotOMDQtwWO6w_Nwq_qsEPxX3-hfaGyGKEeo4r1dps',

  /** FOLDER_ID Drive tujuan unggahan. Kalau masih GANTI_, berkas tidak tersimpan. */
  DRIVE_FOLDER_ID: '1CkWLHJGgd7A3fXTNm5eSIZhsnTb4o-S9',

  /** Batas payload JSON (base64 ikut dihitung) dalam byte. Batas Google 50 MB. */
  MAKS_PAYLOAD_BYTES: 40 * 1024 * 1024,

  /** Batas baris per repeater. 60 trek = batas form admin. */
  MAKS_TREK: 60,
  MAKS_BARIS: 30,

  NAMA_SHEET: 'Pengiriman',
};


// =============================================================================
// ENTRY POINT
// =============================================================================

/**
 * Dipanggil Apps Script untuk setiap POST.
 *
 * Sisi klien sengaja mengirim `Content-Type: text/plain`. Kalau klien memakai
 * `application/json`, browser melakukan preflight OPTIONS yang dijawab Apps
 * Script dengan 401 - itu penyebab kegagalan CORS paling umum untuk form yang
 *.host di GitHub Pages. `text/plain` adalah "simple request": tidak ada
 * preflight, jadi tidak pernah menabrak CORS.
 */
function doPost(e) {
  var muatan = null;

  try {
    muatan = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return balas(400, { ok: false, msg: 'Payload tidak bisa dibaca sebagai JSON.' });
  }

  // Jerat bot. Field ini disembunyikan dari pengguna; bot pengisi-otomatis
  // biasanya ikut mengisinya. Ini filter sampah murah, bukan keamanan.
  if (muatan.perangkap) {
    return balas(200, { ok: true, ref: '-', msg: 'Tercatat.' });
  }

  try {
    var hasil = proses(muatan);

    return balas(200, {
      ok: true,
      ref: hasil.ref,
      msg: 'Pengiriman diterima. Simpan nomor ini sebagai bukti.',
      jumlahBerkas: hasil.jumlahBerkas,
      folder: hasil.folderUrl,
    });
  } catch (err) {
    // Galat dibalas sebagai pesan, bukan dilempar: halaman statis tidak punya
    // cara menampilkan stack trace, dan pengisi perlu tahu apa yang ditolak
    // supaya bisa memperbaikinya.
    return balas(400, { ok: false, msg: pesanGalat(err) });
  }
}

/**
 * GET dipakai halaman untuk memeriksa apakah endpoint sudah terpasang. Menjawab
 * JSON singkat, supaya developer bisa memastikan URL-nya benar sebelum demo
 * diunggah.
 */
function doGet() {
  var sheetAda = KONFIGURASI.SPREADSHEET_ID.indexOf('GANTI_') !== 0;
  var driveAda = KONFIGURASI.DRIVE_FOLDER_ID.indexOf('GANTI_') !== 0;
  var peringatan = [];

  if (!sheetAda) {
    peringatan.push('SPREADSHEET_ID belum diisi - isi pengiriman akan hilang.');
  }
  if (!driveAda) {
    peringatan.push('DRIVE_FOLDER_ID belum diisi - foto dan audio tidak tersimpan.');
  }

  return balas(200, {
    ok: true,
    pesan: 'Endpoint kontribusi Noiseantara aktif.',
    sheetTerpasang: sheetAda,
    driveTerpasang: driveAda,
    peringatan: peringatan,
  });
}


// =============================================================================
// PROSES UTAMA
// =============================================================================

function proses(muatan) {
  muatan = muatan || {};

  var ukuran = JSON.stringify(muatan).length;

  if (ukuran > KONFIGURASI.MAKS_PAYLOAD_BYTES) {
    throw new Error(
      'Pengiriman terlalu besar (' + Math.round(ukuran / 1048576) + ' MB). '
      + 'Batas ' + Math.round(KONFIGURASI.MAKS_PAYLOAD_BYTES / 1048576) + ' MB. '
      + 'Kurangi jumlah foto atau trek.'
    );
  }

  var rilisan = muatan.rilisan || {};

  if (teks(rilisan.judul) === '') {
    throw new Error('Judul rilisan wajib diisi.');
  }

  var judulAlternatif = (muatan.judulAlternatif || [])
    .map(teks)
    .filter(function (j) {
      return j !== '';
    })
    .map(potong.bind(null, 200));

  var artis = bersihkanBaris(muatan.artis, 'nama', KONFIGURASI.MAKS_BARIS);
  var genre = bersihkanBaris(muatan.genre, 'nama', KONFIGURASI.MAKS_BARIS);
  var trek = bersihkanBaris(muatan.trek, 'judul', KONFIGURASI.MAKS_TREK);
  var media = bersihkanBaris(muatan.media, null, KONFIGURASI.MAKS_BARIS);
  var sumber = bersihkanBaris(muatan.sumber, 'jenis', KONFIGURASI.MAKS_BARIS);

  var ref = nomorReferensi();

  // Berkas diunggah lebih dulu. Kalau Drive gagal, tidak ada baris sheet yang
  // menunjuk berkas tak terjangkau. Kalau sheet yang gagal, berkas jadi yatim
  // tapi masih bisa dicari lewat nama subfolder - kebalikannya tidak berlaku.
  var unggahan = unggahSemua(muatan, ref);
  var berkas = unggahan.daftar;

  tulisBaris(barisSheet(muatan, ref, rilisan, judulAlternatif, artis, genre, trek, media, sumber, berkas, unggahan.folderUrl));

  return {
    ref: ref,
    folderUrl: unggahan.folderUrl,
    jumlahBerkas: berkas.filter(function (b) {
      return b.oke;
    }).length,
  };
}


/**
 * Satu baris per pengiriman. Kolom sudah diurutkan supaya sheet langsung bisa
 * dibaca kurator tanpa disentuh formula apa pun.
 */
function barisSheet(muatan, ref, rilisan, judulAlternatif, artis, genre, trek, media, sumber, berkas, folderUrl) {
  return [
    new Date(),
    ref,
    teks(muatan.pengirim && muatan.pengirim.nama),
    teks(muatan.pengirim && muatan.pengirim.kontak),
    teks(rilisan.judul),
    teks(rilisan.jenis),
    teks(rilisan.tahun),
    teks(rilisan.tanggalRilis),
    teks(rilisan.presisiTanggal),
    teks(rilisan.label),
    teks(rilisan.katalog),
    (rilisan.formatFisik || []).join(' + '),
    potong(teks(rilisan.deskripsi), 5000),
    judulAlternatif.join(' | '),
    artis.map(function (a) {
      return a.nama + (a.peran && a.peran !== 'utama' ? ' (' + a.peran + ')' : '');
    }).join(' | '),
    genre.map(function (g) {
      return g.nama + (g.utama ? ' (utama)' : '');
    }).join(' | '),
    trek.length,
    totalDurasi(trek),
    trek.map(function (t, i) {
      return (i + 1) + '. ' + t.judul + (t.durasi ? ' [' + t.durasi + ']' : '');
    }).join('\n'),
    trek.filter(function (t) {
      return t.lirik !== '';
    }).map(function (t) {
      return t.judul;
    }).join(' | '),
    media.length,
    berkas.filter(function (b) {
      return b.kelompok === 'media' && b.oke;
    }).length,
    trek.filter(function (t) {
      return t.audio && t.audio.oke;
    }).length,
    sumber.map(function (s) {
      return [s.jenis, s.judulSumber, s.tautan].filter(Boolean).join(' - ');
    }).join('\n'),
    folderUrl,
    JSON.stringify(rangkum(muatan, rilisan, judulAlternatif, artis, genre, trek, media, sumber, berkas)),
  ];
}

var HEADER = [
  'WAKTU', 'REF', 'NAMA', 'KONTAK',
  'JUDUL', 'JENIS', 'TAHUN', 'TANGGAL', 'PRESISI TANGGAL',
  'LABEL', 'KATALOG', 'FORMAT FISIK', 'DESKRIPSI', 'JUDUL ALTERNATIF',
  'ARTIS', 'GENRE',
  'JUMLAH TREK', 'TOTAL DURASI', 'DAFTAR TREK', 'TREK BERLIRIK',
  'JUMLAH MEDIA', 'BERKAS MEDIA', 'BERKAS AUDIO',
  'SUMBER', 'FOLDER DRIVE', 'ISI LENGKAP (JSON)',
];

/**
 * Isi lengkap tanpa base64. Base64 di sheet akan membuat satu baris ratusan
 * kilobyte dan halamannya mustahil dibuka; berkasnya sudah ada di Drive, jadi
 * yang disimpan di sini cukup nama dan tautannya.
 */
function rangkum(muatan, rilisan, judulAlternatif, artis, genre, trek, media, sumber, berkas) {
  var namaBerkas = {};

  berkas.forEach(function (b) {
    if (b.oke) {
      namaBerkas[b.nama] = b.url;
    }
  });

  return {
    pengirim: {
      nama: teks(muatan.pengirim && muatan.pengirim.nama),
      kontak: teks(muatan.pengirim && muatan.pengirim.kontak),
    },
    rilisan: {
      judul: teks(rilisan.judul),
      jenis: teks(rilisan.jenis),
      tahun: teks(rilisan.tahun),
      tanggalRilis: teks(rilisan.tanggalRilis),
      presisiTanggal: teks(rilisan.presisiTanggal),
      label: teks(rilisan.label),
      katalog: teks(rilisan.katalog),
      formatFisik: rilisan.formatFisik || [],
      deskripsi: potong(teks(rilisan.deskripsi), 5000),
      judulAlternatif: judulAlternatif,
    },
    artis: artis,
    genre: genre,
    trek: trek.map(function (t) {
      return {
        no: t.no,
        judul: t.judul,
        artisTamu: t.artisTamu,
        durasi: t.durasi,
        lirik: t.lirik,
        audio: t.audio && t.audio.nama ? (namaBerkas[t.audio.nama] || t.audio.nama) : '',
      };
    }),
    media: media.map(function (m) {
      return {
        jenis: m.jenis,
        keterangan: m.keterangan,
        kredit: m.kredit,
        namaBerkas: m.namaBerkas,
        tautan: namaBerkas[m.namaBerkas] || '',
      };
    }),
    sumber: sumber,
    catatan: potong(teks(muatan.catatan), 1000),
    dikirim_pada: teks(muatan.dikirimPada),
  };
}


// =============================================================================
// GOOGLE SHEET
// =============================================================================

function tulisBaris(baris) {
  if (KONFIGURASI.SPREADSHEET_ID.indexOf('GANTI_') === 0) {
    // Sheet belum dipasang: simpan ke script properties supaya isi kiriman
    // tidak hilang tanpa jejak saat masih dikerjakan.
    PropertiesService.getScriptProperties().setProperty(
      'tanpa-sheet-' + new Date().getTime(),
      JSON.stringify(baris)
    );
    return;
  }

  var ss = SpreadsheetApp.openById(KONFIGURASI.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(KONFIGURASI.NAMA_SHEET) || ss.insertSheet(KONFIGURASI.NAMA_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADER.length)
      .setFontWeight('bold')
      .setBackground('#121411')
      .setFontColor('#f1f0e8');
    sheet.autoResizeColumns(1, HEADER.length);
    sheet.setColumnWidth(HEADER.length, 260);
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, Math.max(HEADER.length, baris.length)).setValues([baris]);
}


// =============================================================================
// GOOGLE DRIVE
// =============================================================================

/**
 * Bentuk berkas dari sisi klien: { nama, mime, data } dengan `data` = base64
 * TANPA prefiks "data:...;base64,". Prefiks itu dilepas sebelum dikirim supaya
 * tidak menambah bobot payload tanpa perlu.
 *
 * @return {{daftar: Array<Object>, folderUrl: string}}
 */
function unggahSemua(muatan, ref) {
  var hasil = [];
  var antre = [];
  var folderUrl = '';

  (muatan.media || []).forEach(function (m) {
    if (m.berkas && m.berkas.data) {
      antre.push({ kelompok: 'media', berkas: m.berkas });
    }
  });

  (muatan.trek || []).forEach(function (t) {
    if (t.audio && t.audio.data) {
      antre.push({ kelompok: 'audio', berkas: t.audio });
    }
  });

  if (antre.length === 0) {
    return hasil;
  }

  if (KONFIGURASI.DRIVE_FOLDER_ID.indexOf('GANTI_') === 0) {
    antre.forEach(function (d) {
      hasil.push({
        kelompok: d.kelompok,
        nama: d.berkas.nama,
        url: '(DRIVE_FOLDER_ID belum diisi)',
        oke: false,
      });
    });
    return { daftar: hasil, folderUrl: '' };
  }

  var induk = DriveApp.getFolderById(KONFIGURASI.DRIVE_FOLDER_ID);
  var judul = teks((muatan.rilisan || {}).judul) || 'tanpa-judul';
  var folder = induk.createFolder(ref + ' - ' + slug(judul));
  folderUrl = folder.getUrl();

  antre.forEach(function (d) {
    var nama = namaAman(d.berkas.nama);

    try {
      var blob = Utilities.newBlob(
        Utilities.base64Decode(String(d.berkas.data).replace(/^data:[^;]+;base64,/, '')),
        d.berkas.mime || 'application/octet-stream',
        nama
      );

      var file = folder.createFile(blob);

      hasil.push({
        kelompok: d.kelompok,
        nama: nama,
        url: file.getUrl(),
        id: file.getId(),
        oke: true,
      });
    } catch (err) {
      // Satu berkas gagal tidak boleh membatalkan sisa pengiriman. Pengisi
      // tetap berhak atas barisnya, dan berkas yang gagal tercatat supaya
      // kurator tahu ada yang perlu ditanyakan balik.
      hasil.push({
        kelompok: d.kelompok,
        nama: nama,
        url: '(gagal: ' + pesanGalat(err) + ')',
        oke: false,
      });
    }
  });

  return { daftar: hasil, folderUrl: folderUrl };
}


// =============================================================================
// UTILITAS
// =============================================================================

/**
 * Baris repeater: buang yang kosong, pangkas panjangnya, batasi jumlahnya.
 * Tanpa ini, form yang sengaja dikosongkan pengisi akan menambah puluhan baris
 * kosong ke sheet dan menutupi kiriman yang sebenarnya.
 */
function bersihkanBaris(baris, kunciWajib, batas) {
  var keluar = [];

  (baris || []).slice(0, batas).forEach(function (b, i) {
    b = b || {};

    if (kunciWajib && teks(b[kunciWajib]) === '') {
      return;
    }

    keluar.push({
      no: b.no || i + 1,
      judul: potong(teks(b.judul), 200),
      nama: potong(teks(b.nama), 200),
      jenis: potong(teks(b.jenis), 60),
      peran: potong(teks(b.peran), 60),
      utama: !!b.utama,
      artisTamu: potong(teks(b.artisTamu), 200),
      durasi: potong(teks(b.durasi), 10),
      lirik: potong(teks(b.lirik), 20000),
      keterangan: potong(teks(b.keterangan), 200),
      kredit: potong(teks(b.kredit), 200),
      judulSumber: potong(teks(b.judulSumber), 200),
      tautan: potong(teks(b.tautan), 500),
      pemilik: potong(teks(b.pemilik), 120),
      catatan: potong(teks(b.catatan), 1000),
      namaBerkas: potong(teks(b.namaBerkas), 200),
      audio: b.audio ? { nama: potong(teks(b.audio.nama), 200) } : null,
    });
  });

  return keluar;
}

/** "03:45" dan "225" sama-sama dibaca 3 menit 45 detik, seperti form admin. */
function totalDurasi(trek) {
  var detik = 0;

  trek.forEach(function (t) {
    var bagian = String(t.durasi || '').split(':');

    if (bagian.length === 2) {
      detik += (parseInt(bagian[0], 10) || 0) * 60 + (parseInt(bagian[1], 10) || 0);
    } else if (bagian.length === 1) {
      detik += parseInt(bagian[0], 10) || 0;
    }
  });

  var jam = Math.floor(detik / 3600);
  var menit = Math.floor((detik % 3600) / 60);
  var sisa = detik % 60;

  return jam > 0
    ? jam + ':' + ('0' + menit).slice(-2) + ':' + ('0' + sisa).slice(-2)
    : ('0' + menit).slice(-2) + ':' + ('0' + sisa).slice(-2);
}

/**
 * NSR-YYYYMMDD-XXX. Suffix bukan acak murni: tiga digit terakhir milidetik
 * dalam UTC, jadi dua pengiriman dalam milidetik yang sama sangat jarang dan
 * urutannya tetap bisa dibandingkan dengan kolom WAKTU.
 */
function nomorReferensi() {
  var hari = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
  var detik = Utilities.formatDate(new Date(), 'UTC', 'SSS');

  return 'NSR-' + hari + '-' + detik;
}

function slug(t) {
  return String(t)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'tanpa-judul';
}

/**
 * Drive menolak diam-diam nama berkas yang memuat karakter terlarang. Nama dari
 * `<input type="file">` bisa berisi apa saja, jadi dibersihkan sebelum disimpan.
 */
function namaAman(nama) {
  var bersih = String(nama || 'berkas')
    .replace(/[\/\\?*:|"<>\x00-\x1F]/g, '-')
    .replace(/^\.+/, '_')
    .slice(0, 120);

  return bersih || 'berkas';
}

function teks(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function potong(v, n) {
  return v.length > n ? v.slice(0, n) : v;
}

function pesanGalat(err) {
  return String((err && err.message) || err || 'Kesalahan tidak diketahui.');
}

/**
 * ContentService sudah memasang `Access-Control-Allow-Origin: *` untuk web app
 * yang disiarkan "Anyone", jadi tidak ada header tambahan yang perlu di sini.
 */
function balas(kode, objek) {
  return ContentService
    .createTextOutput(JSON.stringify(objek))
    .setMimeType(ContentService.MimeType.JSON);
}