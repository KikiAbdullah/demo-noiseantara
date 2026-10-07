/* =============================================================================
 * KONTRIBUSI - LOGIKA FORM KIRIM RILISAN
 * =============================================================================
 *
 * Berkas ini menjalankan halaman kontribusi/rilisan.html: repeater, kompresi
 * gambar, validasi, lalu pengiriman ke Google Apps Script.
 *
 * Prinsip yang dipakai di sini:
 *
 *  - Tidak ada dependensi. Demo ini tidak punya build step, jadi tidak boleh
 *    ada import, modul, atau pustaka tambahan. ES5 saja supaya jalan di
 *    peramban lama yang masih Disebut di daftar dukungan situs.
 *
 *  - Tidak ada rahasia. Tidak ada API key, tidak ada token. Endpoint-nya
 *    publik dan memang harus begitu --secret di peramban bukan secret.
 *
 *  - Kegagalan selalu NAMPAK. Galat validasi, endpoint yang belum dipasang,
 *    kuota yang habis, dan gambar yang ditolak semuanya ditulis ke layar dengan
 *    kalimat yang bisa ditindaklanjuti. Form yang diam-diam gagal adalah
 *    kebohongan, dan kurator yang mengira entri terkirim padahal tidak adalah
 *    skenario terburuk yang bisa terjadi di halaman seperti ini.
 *
 * =============================================================================
 */

(function () {
    'use strict';

    var KONF = window.KONTRIBUSI || {};
    var BATAS = KONF.BATAS || {
        GAMBAR_MB: 8,
        AUDIO_MB: 10,
        TOTAL_MB: 35,
        SISI_MAKS: 1800,
        JPEG_MUTU: 0.85,
    };

    var form = document.getElementById('formKontribusi');
    if (!form) {
        return;
    }

    var tombolKirim = document.getElementById('tombolKirim');
    var blokHasil = document.querySelector('[data-hasil]');
    var catatanEndpoint = document.querySelector('[data-endpoint-note]');
    var catatanJerat = form.querySelector('[data-perangkap-note]');
    var navItem = form.querySelectorAll('[data-nav-item]');

    // Isi form sudah ada di peramban lain sebelum halaman ini dibuka? Kalau
    // iya, jangan ganggu --peramban biasanya pulih dari reload dengan sendirinya.
    var pulih = false;
    try {
        pulih = sessionStorage.getItem('kontribusi-dibuka') === '1';
        sessionStorage.setItem('kontribusi-dibuka', '1');
    } catch (e) {
        // Private mode. Tidak masalah: hanya memengaruhi recommendations kecil.
    }


    // ========================================================================
    // PESAN SINGKAT
    // ========================================================================

    var toastEl = document.getElementById('siteToast');
    var toastTeks = document.getElementById('siteToastText');

    function toast(pesan) {
        if (toastTeks) {
            toastTeks.textContent = pesan;
        }
        if (toastEl && window.bootstrap) {
            try {
                window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 5200 }).show();
                return;
            } catch (e) {
                // Abaikan - jatuh ke alert di bawah.
            }
        }
        window.alert(pesan);
    }

    function batasi(teks, n) {
        teks = String(teks == null ? '' : teks);
        return teks.length > n ? teks.slice(0, n) : teks;
    }

    function duaAngka(n) {
        return (n < 10 ? '0' : '') + n;
    }


    // ========================================================================
    // REPEATER
    // ========================================================================
    //
    // SatuRepeater dapat menambah, menghapus, menggeser, dan menghitung ulang.
    // Batas baris dibaca dari `data-max`, sama seperti form kurator.
    //
    // Yang TIDAK ada di sini, dibanding form kurator: select2. Demo publik tidak
    // memuat pustaka select2, dan menambahkannya hanya untuk mempercantik
    // dropdown yang isinya bisa diketik juga akan jadi beban yang tidak
    // sebanding. Kolom yang perlu select2 (dropdown artis/genre) di sini memang
    // sudah berupa input teks dengan daftar saran.

    function barisRepeater(bagian) {
        return bagian.querySelectorAll('[data-repeater-rows] > .k-row');
    }

    function perbaruiRepeater(bagian) {
        var baris = barisRepeater(bagian);
        var maks = parseInt(bagian.getAttribute('data-max'), 10) || 0;
        var penuh = maks > 0 && baris.length >= maks;

        baris.forEach(function (b, i) {
            var ord = b.querySelector('.k-row-ord');
            if (ord) {
                ord.textContent = duaAngka(i + 1);
            }
            nomorTrekOtomatis(b, i + 1);
        });

        var hitung = bagian.querySelector('[data-repeater-count]');
        if (hitung) {
            hitung.textContent = duaAngka(baris.length);
        }

        var maksHint = bagian.querySelector('[data-repeater-max]');
        if (maksHint) {
            maksHint.hidden = !penuh;
        }

        var tombolTambah = bagian.querySelector('[data-repeater-add]');
        if (tombolTambah) {
            tombolTambah.disabled = penuh;
            tombolTambah.setAttribute('aria-disabled', penuh ? 'true' : 'false');
        }
    }

    /**
     * Nomor trek diisi otomatis selama pengisi belum menyentuhnya. Form kurator
     * melakukan hal yang sama lewat `renumberTracks` - kalau nomor lama sudah
     * diketik, baris itu dibiarkan apa adanya supaya urutan yang kurator susun
     * sendiri tidak ditimpa diam-diam.
     */
    function nomorTrekOtomatis(baris, urutan) {
        var bagian = baris.closest('[data-repeater]');
        if (!bagian || bagian.getAttribute('data-repeater') !== 'trek') {
            return;
        }

        var nomor = baris.querySelector('[data-bind="trek.no"]');
        if (!nomor) {
            return;
        }

        if (nomor.value === '' || nomor.dataset.manual === '1') {
            if (nomor.dataset.manual !== '1') {
                nomor.value = urutan;
            }
        }
    }

    function tambahBaris(bagian) {
        var template = bagian.querySelector('[data-repeater-template]');
        var wadah = bagian.querySelector('[data-repeater-rows]');
        if (!template || !wadah) {
            return null;
        }

        var maks = parseInt(bagian.getAttribute('data-max'), 10) || 0;
        var sekarang = barisRepeater(bagian).length;

        if (maks > 0 && sekarang >= maks) {
            toast('Batas ' + maks + ' baris sudah tercapai.');
            return null;
        }

        // Penanda unik dipakai supaya setiap salinan punya nama/relasi sendiri
        // ketika nanti dibaca. Identik ke-i sudah cukup untuk satu form, tapi
        // unik pendek lebih aman kalau markup-nya disalin berkali-kali.
        var html = template.innerHTML
            .split('__N__').join('n' + Date.now() + '_' + sekarang)
            .split('__I__').join(String(sekarang));

        wadah.insertAdjacentHTML('beforeend', html);

        var baru = wadah.lastElementChild;
        perbaruiRepeater(bagian);

        var isian = baru.querySelector('input:not([type="file"]):not([type="hidden"]), textarea, select');
        if (isian) {
            isian.focus();
        }

        if (typeof baru.scrollIntoView === 'function') {
            baru.scrollIntoView({ block: 'nearest' });
        }

        umumkan('Baris ditambahkan. ' + (sekarang + 1) + ' baris.');
        tandaiKotor();

        return baru;
    }

    function hapusBaris(bagian, baris) {
        var semua = barisRepeater(bagian);
        var posisi = semua.indexOf(baris);

        baris.remove();
        perbaruiRepeater(bagian);
        tandaiKotor();

        var sisa = barisRepeater(bagian);
        umumkan('Baris dihapus. ' + sisa.length + ' baris tersisa.');

        // Fokus pindah ke baris sebelumnya supaya papan ketik tidak "terhenti"
        // di tempat yang baru saja dihapus. Tanpa ini, pengguna mouse tidak
        // merasa kehilangan fokus sama sekali.
        if (posisi >= 0) {
            var ganti = sisa[Math.max(0, posisi - 1)];
            var tombol = ganti && ganti.querySelector('.k-row-remove');
            if (tombol) {
                tombol.focus();
            }
        }
    }

    function geserBaris(bagian, baris, arah) {
        var semua = barisRepeater(bagian);
        var i = semua.indexOf(baris);
        var target = semua[i + arah];

        if (!target) {
            return;
        }

        if (arah < 0) {
            bagian.querySelector('[data-repeater-rows]').insertBefore(baris, target);
        } else {
            target.after(baris);
        }

        perbaruiRepeater(bagian);
        tandaiKotor();

        var fokus = refocus(baris);
        if (fokus) {
            fokus.focus();
        }
    }

    function refocus(baris) {
        return baris.querySelector('.k-row-move[data-move="1"]')
            || baris.querySelector('.k-row-remove')
            || baris.querySelector('input');
    }

    function urutkanTrek(bagian) {
        barisRepeater(bagian).forEach(function (b, i) {
            var nomor = b.querySelector('[data-bind="trek.no"]');
            if (nomor) {
                nomor.value = i + 1;
                nomor.dataset.manual = '1';
            }
        });

        perbaruiRepeater(bagian);
        tandaiKotor();
        umumkan('Nomor trek diurutkan 1 sampai ' + barisRepeater(bagian).length + '.');
    }

    /** Layar pembaca: satu region langsung, di-trigger tanpa fokus. */
    var liveEl = null;

    function siapkanLive() {
        if (liveEl) {
            return;
        }
        liveEl = document.createElement('p');
        liveEl.className = 'sr-only';
        liveEl.setAttribute('role', 'status');
        liveEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(liveEl);
    }

    function umumkan(pesan) {
        siapkanLive();
        if (liveEl) {
            liveEl.textContent = pesan;
        }
    }


    // ========================================================================
    // PENANDAAN KOTOR + PERINGATAN KELUAR
    // ========================================================================

    var formKotor = false;
    var sedangKirim = false;

    function tandaiKotor() {
        if (formKotor) {
            return;
        }
        formKotor = true;

        form.querySelectorAll('[data-save-note]').forEach(function (n) {
            if (n.dataset.noteDirty) {
                n.textContent = n.dataset.noteDirty;
            }
        });
    }

    function bersihkanKotor() {
        formKotor = false;

        form.querySelectorAll('[data-save-note]').forEach(function (n) {
            if (n.dataset.noteIdle) {
                n.textContent = n.dataset.noteIdle;
            }
        });
    }

    // Peramban sudah menanyakan sendiri lewat dialog bawaannya; pesan kustom
    // hanya ditambahkan kalau pengisi sudah menyentuh form. Memaksa dialog
    // sendiri di sini akan menghasilkan dua pertanyaan sekaligus.
    var sudahSentuh = false;

    form.addEventListener('input', function () {
        if (!sudahSentuh) {
            sudahSentuh = true;
        }
        tandaiKotor();
    });

    form.addEventListener('change', function () {
        sudahSentuh = true;
        tandaiKotor();
    });


    // ========================================================================
    // VALIDASI
    // ========================================================================

    function bersihkanGalat() {
        form.querySelectorAll('.k-invalid').forEach(function (el) {
            el.classList.remove('k-invalid');
            el.removeAttribute('aria-invalid');
        });
        form.querySelectorAll('.k-error').forEach(function (p) {
            p.hidden = true;
            p.textContent = '';
        });
    }

    function tandaiGalat(elemen, pesan) {
        if (elemen) {
            elemen.classList.add('k-invalid');
            elemen.setAttribute('aria-invalid', 'true');
        }

        var galat = form.querySelector('[data-error-for="' + (elemen && elemen.name ? elemen.name : '') + '"]');
        if (galat) {
            galat.textContent = pesan;
            galat.hidden = false;
        }
    }

    /**
     * Validasi sisi peramban. Regel yang sama dengan sisi server, tapi lebih
     * sedikit - server tetap memeriksa ulang karena peramban bisa dilewati.
     * Yang ditegakkan di sini hanya yang murah dicek dan mahal kalau dikoreksi
     * setelah terkirim: judul kosong, kontak kosong, trek tanpa nomor.
     */
    function periksa() {
        bersihkanGalat();

        var galat = [];
        var judul = form.querySelector('[data-bind="rilisan.judul"]');
        var jenis = form.querySelector('[data-bind="rilisan.jenis"]');
        var nama = form.querySelector('[data-bind="pengirim.nama"]');
        var kontak = form.querySelector('[data-bind="pengirim.kontak"]');

        if (!judul.value.trim()) {
            tandaiGalat(judul, 'Judul rilisan wajib diisi.');
            galat.push(judul);
        }

        if (!jenis.value) {
            tandaiGalat(jenis, 'Pilih jenis rilisannya.');
            galat.push(jenis);
        }

        if (!nama.value.trim()) {
            tandaiGalat(nama, 'Tulis nama kamu supaya kurator bisa menghubungi.');
            galat.push(nama);
        }

        if (!kontak.value.trim()) {
            tandaiGalat(kontak, 'Email atau nomor telepon wajib diisi.');
            galat.push(kontak);
        }

        // Trek: nomor yang diketik manual boleh bentrok (form kurator juga
        // membiarkan kurator menyusun sendiri), tapi trek yang punya judul dan
        // TIDAK punya nomor sama sekali hampir pasti tidak disengaja.
        var trek = form.querySelector('[data-repeater="trek"]');
        if (trek) {
            var tanpaNomor = 0;
            barisRepeater(trek).forEach(function (b) {
                var j = b.querySelector('[data-bind="trek.judul"]');
                var n = b.querySelector('[data-bind="trek.no"]');
                if (j && j.value.trim() && n && !n.value) {
                    tanpaNomor++;
                }
            });

            if (tanpaNomor > 0) {
                galat.push(trek.querySelector('[data-bind="trek.no"]'));
                toast(tanpaNomor + ' trek punya judul tapi nomor kosong. Tekan URUTKAN 1..n.');
            }
        }

        return galat;
    }

    function durasiKeDetik(teks) {
        teks = String(teks || '').trim();
        if (teks === '') {
            return 0;
        }

        var bagian = teks.split(':');

        if (bagian.length === 2) {
            var m = parseInt(bagian[0], 10) || 0;
            var s = parseInt(bagian[1], 10) || 0;
            // Detik di atas 59 ditolak diam-diam jadi tidak: "3:75" mungkin saja
            // salah ketik 4:15, dan lebih baik dikoreksi pengisi daripada
            // ditafsirkan sebagai sesuatu yang tidak pernah mereka tulis.
            return s > 59 ? -1 : (m * 60 + s);
        }

        return parseInt(bagian[0], 10) || 0;
    }

    function cekDurasi(bagian) {
        var galat = bagian.querySelector('[data-dup]');
        var bermasalah = [];

        barisRepeater(bagian).forEach(function (b) {
            var isian = b.querySelector('[data-durasi]');
            var err = b.querySelector('[data-file-error]');
            if (!isian || !err) {
                return;
            }

            var detik = durasiKeDetik(isian.value);

            if (detik === -1) {
                err.textContent = 'Format durasi: mm:ss dengan detik di bawah 60. Mis. 3:45.';
                err.hidden = false;
                isian.classList.add('k-invalid');
                bermasalah.push(isian);
            } else {
                err.hidden = true;
                err.textContent = '';
                isian.classList.remove('k-invalid');
            }
        });

        if (galat) {
            galat.hidden = bermasalah.length === 0;
            galat.textContent = bermasalah.length
                ? bermasalah.length + ' durasi tidak terbaca. Perbaiki sebelum mengirim.'
                : '';
        }

        return bermasalah;
    }

    function hitungTotalDurasi(bagian) {
        var total = 0;

        barisRepeater(bagian).forEach(function (b) {
            var isian = b.querySelector('[data-durasi]');
            var d = isian ? durasiKeDetik(isian.value) : 0;
            if (d > 0) {
                total += d;
            }
        });

        var jam = Math.floor(total / 3600);
        var menit = Math.floor((total % 3600) / 60);
        var sisa = total % 60;

        var label = jam > 0
            ? jam + ':' + duaAngka(menit) + ':' + duaAngka(sisa)
            : duaAngka(menit) + ':' + duaAngka(sisa);

        var badge = bagian.querySelector('[data-runtime-total]');
        if (badge) {
            badge.textContent = label;
        }
    }


    // ========================================================================
    // BERKAS
    // ========================================================================

    var ukuranBerkas = function (b) {
        if (b < 1024) {
            return b + ' B';
        }
        if (b < 1048576) {
            return Math.round(b / 1024) + ' KB';
        }
        return (Math.round((b / 1048576) * 10) / 10) + ' MB';
    };

    /**
     * Kompres gambar di peramban sebelum dikirim.
     *
     * Ini bukan Oppenheimer. Yang terjadi: foto 5 MP dari kamera jadi 300 KB.
     * Alasannya bukan hemat kuota, tapi batas POST Apps Script yang hanya 50 MB
     * - sementara base64 menambah 33% lagi. Tanpa pemotongan ini, tiga foto
     * phone sudah hampir menghabiskan kuota dan pengisi akan mendapat galat
     * "terlalu besar" tanpa sempat mencari tahu kenapa.
     *
     * Berkas asli tidak pernah dikirim. Yang sampai ke Drive adalah hasil
     * resize, jadi kurator hanya menerima citra yang sudah diperkecil - itu
     * hal yang perlu diketahui kurator, dan memang begitulah cara kerja
     * pipeline media di aplikasi aslinya.
     */
    function kompresGambar(berkas) {
        return new Promise(function (selesai) {
            if (!/^image\//.test(berkas.type)) {
                // healhPNG/SVG danJPEG/PNG biasa dari user iya. Kalau types-nya
                // tidak dikenal, biarkan lewat apa adanya - lebih baik
                // terkirim mentah daripada ditolak karena tebakan salah.
                selesai({ nama: berkas.name, mime: berkas.type || 'application/octet-stream', data: null, dilewati: true });
                return;
            }

            var gambar = new Image();
            var url = URL.createObjectURL(berkas);

            gambar.onload = function () {
                try {
                    var sisiMaks = BATAS.SISI_MAKS || 1800;
                    var skala = Math.min(1, sisiMaks / Math.max(gambar.width, gambar.height));
                    var lebar = Math.max(1, Math.round(gambar.width * skala));
                    var tinggi = Math.max(1, Math.round(gambar.height * skala));

                    var kanvas = document.createElement('canvas');
                    kanvas.width = lebar;
                    kanvas.height = tinggi;

                    var ctx = kanvas.getContext('2d');
                    // Latar putih, bukan transparan: JPEG tidak punya alpha, dan
                    // tanpa ini area transparan jadi hitam unpredictable.
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, lebar, tinggi);
                    ctx.drawImage(gambar, 0, 0, lebar, tinggi);

                    var dataUrl = kanvas.toDataURL('image/jpeg', BATAS.JPEG_MUTU || 0.85);
                    var base64 = dataUrl.split(',')[1] || '';

                    selesai({
                        nama: gantiSuffix(berkas.name, '.jpg'),
                        mime: 'image/jpeg',
                        data: base64,
                        ukuranAsli: berkas.size,
                        ukuranKirim: perkiraanBase64(base64),
                        melebar: lebar,
                        tinggi: tinggi,
                    });
                } catch (err) {
                    // Canvas gagal (format aneh, atau peramban tanpa dukungan).
                    // Kirim apa adanya sebagai fallback, jangan tolak pengisi.
                    selesai({ nama: berkas.name, mime: berkas.type, data: null, dilewati: true });
                } finally {
                    URL.revokeObjectURL(url);
                }
            };

            gambar.onerror = function () {
                URL.revokeObjectURL(url);
                selesai({ nama: berkas.name, mime: berkas.type || 'application/octet-stream', data: null, dilewati: true });
            };

            gambar.src = url;
        });
    }

    function gantiSuffix(nama, akhir) {
        return String(nama || 'berkas').replace(/\.[^.]+$/, '') + akhir;
    }

    function perkiraanBase64(base64) {
        return Math.round(base64.length * 0.75);
    }

    /**
     * Audio TIDAK dikompres. Kompres MP3 atau FLAC di peramban bukan
     * sesuatu yang bisa dilakukan tanpa pustaka encoder, dan memotong kualitas
     * audio di arsip justru merusak bukti - arsip menyimpan berkas apa adanya.
     * Audio karena itu dibatasi ketat di ukuran, bukan dikompres.
     */
    function bacaAudio(berkas) {
        return new Promise(function (selesai, gagal) {
            if (berkas.size > (BATAS.AUDIO_MB || 10) * 1048576) {
                gagal(new Error(
                    'Audio ' + ukuranBerkas(berkas.size) + ' melebihi batas ' + (BATAS.AUDIO_MB || 10) + ' MB. '
                    + 'Audio tidak dikompres - potong rekaman atau kirim tautan Indus.'
                ));
                return;
            }

            var baca = new FileReader();

            baca.onload = function () {
                selesai({
                    nama: berkas.name,
                    mime: berkas.type || 'audio/mpeg',
                    data: String(baca.result).split(',')[1] || '',
                    ukuranKirim: berkas.size,
                });
            };

            baca.onerror = function () {
                gagal(new Error('Berkas audio tidak bisa dibaca.'));
            };

            baca.readAsDataURL(berkas);
        });
    }


    // ========================================================================
    // PENGIRIMAN
    // ========================================================================

    function kumpulkan() {
        var bagianTrek = form.querySelector('[data-repeater="trek"]');
        var bagianMedia = form.querySelector('[data-repeater="media"]');
        var bagianArtis = form.querySelector('[data-repeater="artis"]');
        var bagianGenre = form.querySelector('[data-repeater="genre"]');
        var bagianSumber = form.querySelector('[data-repeater="sumber"]');
        var bagianAlt = form.querySelector('[data-repeater="judul-alternatif"]');

        var formatFisik = [];
        form.querySelectorAll('[data-bind="rilisan.formatFisik"]:checked').forEach(function (c) {
            formatFisik.push(c.value);
        });

        return {
            perangkap: (form.querySelector('[name="perangkap"]') || {}).value || '',
            dikirimPada: new Date().toISOString(),

            pengirim: {
                nama: nilai('pengirim.nama'),
                kontak: nilai('pengirim.kontak'),
            },

            rilisan: {
                judul: nilai('rilisan.judul'),
                jenis: nilai('rilisan.jenis'),
                tahun: nilai('rilisan.tahun'),
                tanggalRilis: nilai('rilisan.tanggalRilis'),
                presisiTanggal: nilai('rilisan.presisiTanggal'),
                label: nilai('rilisan.label'),
                katalog: nilai('rilisan.katalog'),
                formatFisik: formatFisik,
                deskripsi: nilai('rilisan.deskripsi'),
            },

            judulAlternatif: teksSemua(bagianAlt, '[data-bind="judulAlternatif"]'),

            artis: barisSederhana(bagianArtis, 'artis', ['nama', 'peran']),
            genre: barisSederhana(bagianGenre, 'genre', ['nama', 'utama']),

            trek: barisTrek(bagianTrek),
            media: barisMedia(bagianMedia),
            sumber: barisSederhana(bagianSumber, 'sumber', ['jenis', 'judulSumber', 'tautan', 'pemilik', 'catatan']),

            catatan: nilai('catatan'),
        };
    }

    function nilai(jalur) {
        var el = form.querySelector('[data-bind="' + jalur + '"]');
        return el ? String(el.value || '').trim() : '';
    }

    function teksSemua(bagian, selektor) {
        if (!bagian) {
            return [];
        }

        var keluar = [];

        barisRepeater(bagian).forEach(function (b) {
            var el = b.querySelector(selektor);
            if (el && String(el.value || '').trim()) {
                keluar.push(batasi(String(el.value).trim(), 200));
            }
        });

        return keluar;
    }

    function barisSederhana(bagian, awalan, kunci) {
        if (!bagian) {
            return [];
        }

        var keluar = [];

        barisRepeater(bagian).forEach(function (b) {
            var o = {};

            kunci.forEach(function (k) {
                var el = b.querySelector('[data-bind="' + awalan + '.' + k + '"]');
                if (!el) {
                    return;
                }

                if (el.type === 'checkbox') {
                    o[k] = el.checked;
                } else {
                    o[k] = String(el.value || '').trim();
                }
            });

            // Baris yang seluruh isinya kosong dibuang: form yang sengaja
            // dikosongkan pengisi tidak boleh menambah baris kosong ke sheet.
            var adaIsi = kunci.some(function (k) {
                return k !== 'utama' && String(o[k] || '') !== '';
            });

            if (adaIsi) {
                keluar.push(o);
            }
        });

        return keluar;
    }

    function barisTrek(bagian) {
        if (!bagian) {
            return [];
        }

        var keluar = [];
        var dipakai = {};

        barisRepeater(bagian).forEach(function (b, i) {
            var judul = (b.querySelector('[data-bind="trek.judul"]') || {}).value || '';
            judul = String(judul).trim();

            if (!judul) {
                return;
            }

            var no = parseInt((b.querySelector('[data-bind="trek.no"]') || {}).value, 10);
            if (isNaN(no) || no < 1) {
                no = i + 1;
            }

            if (dipakai[no]) {
                dipakai[no] += 1;
            } else {
                dipakai[no] = 1;
            }

            keluar.push({
                no: no,
                judul: batasi(judul, 200),
                artisTamu: String((b.querySelector('[data-bind="trek.artisTamu"]') || {}).value || '').trim(),
                durasi: String((b.querySelector('[data-durasi]') || {}).value || '').trim(),
                lirik: String((b.querySelector('[data-bind="trek.lirik"]') || {}).value || '').trim(),
                // Audio ditambahkan terpisah nanti; di sini hanya penandanya.
                _baris: b,
            });
        });

        return keluar;
    }

    function barisMedia(bagian) {
        if (!bagian) {
            return [];
        }

        var keluar = [];

        barisRepeater(bagian).forEach(function (b) {
            var keterangan = String((b.querySelector('[data-bind="media.keterangan"]') || {}).value || '').trim();
            var kredit = String((b.querySelector('[data-bind="media.kredit"]') || {}).value || '').trim();
            var jenis = String((b.querySelector('[data-bind="media.jenis"]') || {}).value || '').trim();
            var berkas = b.querySelector('[data-media-file]');
            var dihapus = b.querySelector('[data-preview-remove]');
            var punyaBerkas = berkas && berkas.files && berkas.files[0];

            // Baris tanpa keterangan, kredit, dan berkas tidak membawa informasi
            // apa pun - dibuang supaya sheet tidak penuh baris hampa.
            if (!keterangan && !kredit && !punyaBerkas) {
                return;
            }

            keluar.push({
                jenis: jenis,
                keterangan: batasi(keterangan, 200),
                kredit: batasi(kredit, 200),
                namaBerkas: punyaBerkas ? berkas.files[0].name : '',
                _berkas: punyaBerkas && !dihapus.checked ? berkas.files[0] : null,
            });
        });

        return keluar;
    }


    // ========================================================================
    // PROSES KIRIM
    // ========================================================================

    var sedangProses = false;

    function kirim(peristiwa) {
        peristiwa.preventDefault();

        if (sedangProses) {
            return;
        }

        if (catatanJerat) {
            catatanJerat.hidden = true;
            catatanJerat.textContent = '';
        }

        // Bot pengisi-otomatis yang mengisi field jerat: diam-diam diterima
        // supaya bot itu tidak belajar bahwa ada saringan. Kirim ke sheet
        // juga sudah dilewati di sisi server.
        if ((form.querySelector('[name="perangkap"]') || {}).value) {
            selesaiKirim({ ok: true, ref: 'NSR-TERDAFTAR' });
            return;
        }

        var galat = periksa();
        var bagianTrek = form.querySelector('[data-repeater="trek"]');
        var durasiSalah = bagianTrek ? cekDurasi(bagianTrek) : [];

        if (galat.length || durasiSalah.length) {
            var pertama = galat[0] || durasiSalah[0];
            if (pertama && typeof pertama.scrollIntoView === 'function') {
                pertama.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
            if (pertama && typeof pertama.focus === 'function') {
                pertama.focus({ preventScroll: true });
            }
            toast('Perbaiki dulu bagian yang ditandai merah.');
            return;
        }

        if (!KONF.ENDPOINT) {
            // Endpoint belum diisi. Ini kondisi yang paling mungkin terjadi
            // kalau demo diunggah tanpaebak pengaturan - jadi pesannya harus
            // menyebut file yang harus diedit, bukan sekadar "gagal".
            var catatan = catatanEndpoint;
            if (catatan) {
                catatan.hidden = false;
                catatan.innerHTML = 'Endpoint belum diisi, jadi form ini <b>tidak bisa mengirim</b>. '
                    + 'Buka <code>assets/kontribusi-config.js</code> dan isi <code>ENDPOINT</code> '
                    + 'dengan URL web app Google Apps Script (Deploy → New deployment → Web app). '
                    + 'Semua isian tetap ada di layar - jangan isi ulang.';
            }
            catatan.hasil.scrollIntoView({ block: 'center', behavior: 'smooth' });
            toast('Endpoint belum diisi - lihat catatan di atas form.');
            return;
        }

        sedangProses = true;
        sedangKirim = true;
        bersihkanKotor();
        setTombol(true, 'MENGIRIM…');

        var muatan = kumpulkan();

        Promise.resolve()
            .then(function () {
                return muatan.trek.reduce(function (rantai, t) {
                    return rantai.then(function () {
                        var berkas = t._baris.querySelector('[data-audio]');
                        var file = berkas && berkas.files && berkas.files[0];
                        if (!file) {
                            delete t.audio;
                            delete t._baris;
                            return null;
                        }
                        return bacaAudio(file).then(function (hasil) {
                            t.audio = { nama: hasil.nama, mime: hasil.mime, data: hasil.data };
                            delete t._baris;
                            return null;
                        });
                    });
                }, Promise.resolve());
            })
            .then(function () {
                return muatan.media.reduce(function (rantai, m) {
                    return rantai.then(function () {
                        if (!m._berkas) {
                            delete m._berkas;
                            return null;
                        }
                        var file = m._berkas;
                        if (file.size > (BATAS.GAMBAR_MB || 8) * 1048576) {
                            // Berkas yang melebihi batas ditolak di sini, bukan
                            // di server: kompresi tidak akanercepat, jadi
                            // menguploadnya hanya membakar kuota.
                            delete m._berkas;
                            m._ditolak = 'Gambar ' + ukuranBerkas(file.size) + ' melebihi batas '
                                + (BATAS.GAMBAR_MB || 8) + ' MB.';
                            return null;
                        }
                        return kompresGambar(file).then(function (hasil) {
                            delete m._berkas;
                            if (hasil.data) {
                                m.berkas = hasil;
                            } else {
                                m._ditolak = 'Format gambar tidak bisa dikompres - berkas dilewati.';
                            }
                            return null;
                        });
                    });
                }, Promise.resolve());
            })
            .then(function () {
                muatan.trek.forEach(function (t) {
                    delete t._baris;
                });
                muatan.media.forEach(function (m) {
                    delete m._berkas;
                    delete m._ditolak;
                });

                var ukuranJson = JSON.stringify(muatan).length;
                var maks = (BATAS.TOTAL_MB || 35) * 1048576;

                if (ukuranJson > maks) {
                    throw new Error(
                        'Total kiriman ' + ukuranBerkas(ukuranJson) + ' melebihi batas '
                        + (BATAS.TOTAL_MB || 35) + ' MB. Kurangi jumlah foto atau audio.'
                    );
                }

                return kirimKeEndpoint(muatan);
            })
            .then(function (hasil) {
                selesaiKirim(hasil);
            })
            .catch(function (galat) {
                selesaiKirim({
                    ok: false,
                    msg: (galat && galat.message) ? galat.message : 'Kesalahan tidak diketahui.',
                });
            })
            .then(function () {
                sedangProses = false;
                sedangKirim = false;
                setTombol(false);
            });
    }

    /**
     * POST ke Apps Script dengan `Content-Type: text/plain`.
     *
     * Bukan `application/json` - itu memicu preflight OPTIONS yang dijawab
     * Apps Script dengan 401, dan hasilnya adalah galat CORS yang sama sekali
     * tidakqz связаны dengan penyebab sebenarnya. `text/plain` adalah simple
     * request: browser tidak pernah bertanya dulu.
     *
     * `redirect: 'follow'` wajib. Apps Script membalas lewat
   * script.googleusercontent.com setelah pengalihan dari script.google.com;
     * dengan mode manual, responsnya jadi opaque dan `response.json()` gagal
     * tanpa pesan.
     */
    function kirimKeEndpoint(muatan) {
        return fetch(KONF.ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(muatan),
        })
            .then(function (respons) {
                return respons.text().then(function (teks) {
                    var data = null;
                    try {
                        data = JSON.parse(teks);
                    } catch (e) {
                        // Respons HTML dari halaman login Google. Ini terjadi
                        // kalau endpoint disiarkan "Anyone with Google account"
                        // alih-alih "Anyone" - penyebab paling sering.
                        throw new Error(
                            'Endpoint menjawab dengan halaman yang tidak bisa dibaca. '
                            + 'Periksa di Apps Script: Deploy → Who has access harus "Anyone".'
                        );
                    }

                    if (!respons.ok) {
                        throw new Error((data && data.msg) || 'Server menolak kiriman.');
                    }

                    return data;
                });
            })
            .catch(function (galat) {
                if (galat instanceof TypeError) {
                    // TypeError dari fetch hampir selalu CORS atau jaringan mati.
                    throw new Error(
                        'Tidak sampai ke server. Periksa koneksi, lalu pastikan '
                        + 'URL endpoint di kontribusi-config.js berakhiran /exec.'
                    );
                }
                throw galat;
            });
    }

    function setTombol(sibuk, label) {
        if (!tombolKirim) {
            return;
        }

        tombolKirim.classList.toggle('is-busy', !!sibuk);
        tombolKirim.disabled = !!sibuk;

        var labelEl = tombolKirim.querySelector('.kirim-label');
        if (labelEl && label) {
            labelEl.textContent = label;
        }
    }

    function selesaiKirim(hasil) {
        hasil = hasil || {};

        if (!hasil.ok) {
            // Kegagalan tidak boleh menghapus isian. Pengisi yang sudah mengisi
            // 40 baris tracklist tidak boleh kehilangan semuanya karena satu
            // permintaan gagal - itu penyebab nomor satu orang menyerah.
            setTombol(false);
            tandaiKotor();
            bersihkanKecil();

            var catatan = catatanEndpoint;
            if (catatan) {
                catatan.hidden = false;
                catatan.textContent = hasil.msg || 'Pengiriman gagal.';
            }
            catatanEndpoint.scrollIntoView({ block: 'center', behavior: 'smooth' });
            toast(hasil.msg || 'Pengiriman gagal. Isianmu tetap ada di layar.');
            return;
        }

        bersihkanKecil();

        form.hidden = true;
        if (blokHasil) {
            blokHasil.hidden = false;

            var judul = blokHasil.querySelector('[data-hasil-judul]');
            var pesan = blokHasil.querySelector('[data-hasil-pesan]');
            var ref = blokHasil.querySelector('[data-hasil-ref]');
            var meta = blokHasil.querySelector('[data-hasil-meta]');
            var catatanBawah = blokHasil.querySelector('[data-hasil-catatan]');

            if (judul) {
                judul.textContent = hasil.ref === 'NSR-TERDAFTAR'
                    ? 'Sudah tercatat.'
                    : 'Pengiriman diterima.';
            }

            if (pesan) {
                pesan.textContent = hasil.msg
                    || 'Kurator akan memeriksa isian ini sebelum menjadi bagian dari arsip publik.';
            }

            if (ref) {
                ref.textContent = hasil.ref || '';
                ref.hidden = !hasil.ref;
            }

            if (meta) {
                meta.innerHTML = '';

                [
                    ['NAMA', hasil.nama || ''],
                    ['WAKTU', hasil.waktu || ''],
                    ['BERKAS', hasil.jumlahBerkas ? hasil.jumlahBerkas + ' berkas' : '—'],
                ].forEach(function (p) {
                    var d = document.createElement('div');
                    var s = document.createElement('span');
                    var b = document.createElement('strong');
                    s.textContent = p[0];
                    b.textContent = p[1];
                    d.appendChild(s);
                    d.appendChild(b);
                    meta.appendChild(d);
                });
            }

            if (catatanBawah) {
                catatanBawah.textContent = hasil.folder
                    ? 'Salinan berkas ada di folder Drive: ' + hasil.folder
                    : 'Entri ini masih DRAF. Tidak tampil di arsip publik sampai kurator memverifikasinya.';
            }

            blokHasil.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }

        toast('Terkirim. Nomor referensimu sudah ditampilkan.');
    }

    /** Kosongkan penanda transient; isi form sendiri sengaja TIDAK dikosongkan. */
    function bersihkanKecil() {
        form.querySelectorAll('[data-preview-remove]').forEach(function (c) {
            c.checked = false;
        });
    }


    // ========================================================================
    // PASANG
    // ========================================================================

    form.addEventListener('click', function (e) {
        var tambah = e.target.closest('[data-repeater-add]');
        if (tambah) {
            var bagian = tambah.closest('[data-repeater]');
            if (bagian) {
                tambahBaris(bagian);
            }
            e.preventDefault();
            return;
        }

        var hapus = e.target.closest('.k-row-remove');
        if (hapus) {
            var baris = hapus.closest('.k-row');
            var induk = baris && baris.closest('[data-repeater]');
            if (baris && induk) {
                // Baris yang sudah terisi deserves konfirmasi: menghapus satu
                // baris berarti isinya hilang saat dikirim. Baris kosong langsung
                // hilang, tanpa tanya - itu yang diharapkan orang.
                var isi = baris.querySelector('input:not([type="file"]):not([type="hidden"]):not([type="checkbox"]), textarea');
                var adaIsi = isi && String(isi.value || '').trim() !== '';
                var nomor = baris.querySelector('[data-bind="trek.no"]');
                var adaNomor = nomor && String(nomor.value || '').trim() !== '';

                if (adaIsi || adaNomor) {
                    if (!window.confirm('Baris ini sudah diisi. Hapus dan isinya tidak ikut terkirim?')) {
                        e.preventDefault();
                        return;
                    }
                }
                hapusBaris(induk, baris);
            }
            e.preventDefault();
            return;
        }

        var geser = e.target.closest('.k-row-move');
        if (geser) {
            var b = geser.closest('.k-row');
            var s = b && b.closest('[data-repeater]');
            if (b && s) {
                geserBaris(s, b, parseInt(geser.getAttribute('data-move'), 10));
            }
            e.preventDefault();
            return;
        }

        var urut = e.target.closest('[data-renumber]');
        if (urut) {
            var t = urut.closest('[data-repeater]');
            if (t) {
                urutkanTrek(t);
            }
            e.preventDefault();
        }
    });

    // Nomor trek yang diketik manual tidak boleh ditimpa penomoran otomatis.
    form.addEventListener('input', function (e) {
        if (e.target.matches && e.target.matches('[data-bind="trek.no"]')) {
            e.target.dataset.manual = '1';
        }
        if (e.target.matches && e.target.matches('[data-durasi]')) {
            var bagian = e.target.closest('[data-repeater="trek"]');
            if (bagian) {
                hitungTotalDurasi(bagian);
            }
        }
    });

    // Hanya satu genre boleh berstatus utama.
    form.addEventListener('change', function (e) {
        if (e.target.matches && e.target.matches('[data-genre-primary]') && e.target.checked) {
            var bagian = e.target.closest('[data-repeater="genre"]');
            if (!bagian) {
                return;
            }
            barisRepeater(bagian).forEach(function (b) {
                var c = b.querySelector('[data-genre-primary]');
                if (c && c !== e.target) {
                    c.checked = false;
                }
            });
        }
    });

    // Pratinjau gambar seketika, supaya pengisi tahu berkas mana yang sedang
    // dipilih sebelum menunggu kompresi saat kirim.
    form.addEventListener('change', function (e) {
        var isian = e.target;
        if (!isian.matches || !isian.matches('[data-media-file]')) {
            return;
        }

        var baris = isian.closest('.k-row');
        var pratinjau = baris && baris.querySelector('[data-preview]');
        var galat = baris && baris.querySelector('[data-file-error]');

        if (!pratinjau) {
            return;
        }

        var file = isian.files && isian.files[0];
        if (!file) {
            pratinjau.hidden = true;
            if (galat) {
                galat.hidden = true;
            }
            return;
        }

        if (file.size > (BATAS.GAMBAR_MB || 8) * 1048576) {
            pratinjau.hidden = true;
            if (galat) {
                galat.textContent = 'Gambar ' + ukuranBerkas(file.size) + ' melebihi batas '
                    + (BATAS.GAMBAR_MB || 8) + ' MB.';
                galat.hidden = false;
            }
            isian.value = '';
            return;
        }

        if (galat) {
            galat.hidden = true;
            galat.textContent = '';
        }

        var img = pratinjau.querySelector('[data-preview-img]');
        var namaEl = pratinjau.querySelector('[data-file-name]');
        var ukuranEl = pratinjau.querySelector('[data-file-size]');
        var url = URL.createObjectURL(file);

        if (img) {
            img.src = url;
            img.alt = namaEl ? namaEl.textContent : file.name;
        }
        if (namaEl) {
            namaEl.textContent = file.name;
        }
        if (ukuranEl) {
            ukuranEl.textContent = ukuranBerkas(file.size) + ' · dikompres jadi JPEG saat kirim';
        }

        pratinjau.hidden = false;
    });

    // Cegat unload: isian 40 baris tracklist terlalu mahal untuk hilang diam-diam.
    window.addEventListener('beforeunload', function (e) {
        if (!formKotor || sedangProses) {
            return;
        }
        e.preventDefault();
        e.returnValue = '';
        return '';
    });

    form.addEventListener('submit', kirim);

    var kirimLagi = document.querySelector('[data-kirim-lagi]');
    if (kirimLagi) {
        kirimLagi.addEventListener('click', function () {
            form.reset();
            bersihkanGalat();

            // Baris repeater tidak ikut di-reset: `form.reset()` hanya
            // mengembalikan nilai isian ke atribut HTML-nya, bukan jumlah baris.
            // Jumlah baris kembali ke satu supaya form berikutnya tidak berawal
            // dari 40 baris kosong.
            form.querySelectorAll('[data-repeater]').forEach(function (bagian) {
                var wadah = bagian.querySelector('[data-repeater-rows]');
                var baris = barisRepeater(bagian);
                for (var i = baris.length - 1; i > 0; i--) {
                    baris[i].remove();
                }
                perbaruiRepeater(bagian);
            });

            form.querySelectorAll('[data-preview]').forEach(function (p) {
                p.hidden = true;
            });
            form.querySelectorAll('.k-dup').forEach(function (p) {
                p.hidden = true;
            });

            bersihkanKotor();
            form.hidden = false;
            if (blokHasil) {
                blokHasil.hidden = true;
            }

            form.scrollIntoView({ block: 'start', behavior: 'smooth' });

            var judul = form.querySelector('[data-bind="rilisan.judul"]');
            if (judul) {
                judul.focus({ preventScroll: true });
            }
        });
    }


    // ========================================================================
    // SCROLL-SPY SIDEBAR
    // ========================================================================

    if (navItem.length && typeof window.IntersectionObserver !== 'undefined') {
        var peta = {};

        navItem.forEach(function (a) {
            peta[a.getAttribute('data-nav-item')] = a;
        });

        var pengamat = new IntersectionObserver(function (entri) {
            entri.forEach(function (satu) {
                if (!satu.isIntersecting) {
                    return;
                }
                navItem.forEach(function (a) {
                    a.classList.remove('is-active');
                });
                var aktif = peta[satu.target.id];
                if (aktif) {
                    aktif.classList.add('is-active');
                }
            });
        }, { rootMargin: '-120px 0px -62% 0px', threshold: 0 });

        Object.keys(peta).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                pengamat.observe(el);
            }
        });
    }


    // ========================================================================
    // INIT
    // ========================================================================

    form.querySelectorAll('[data-repeater]').forEach(function (bagian) {
        perbaruiRepeater(bagian);
    });

    var bagianTrekAwal = form.querySelector('[data-repeater="trek"]');
    if (bagianTrekAwal) {
        hitungTotalDurasi(bagianTrekAwal);
    }

    // Pesan kecil ini sengaja muncul HANYA saat halaman dimuat ulang, bukan
    // setiap kali dibuka. Itsinya explains kenapa ada peringatan keluar: isian
    // di form ini benar-benar bertahan di tab yang sama, jadi saatną真的勿 refresh.
    if (pulih) {
        setTimeout(function () {
            toast('Kalau halaman ini terputus, isianmu masih ada di tab ini.');
        }, 1400);
    }

    // Catatan "endpoint belum diisi" hanya boleh tampil selama kondisinya
    // benar. Begitu ENDPOINT terisi, catatan itu harus hilang supaya tidak
    // terbaca sebagai keluhan yang sudah selesai.
    if (catatanEndpoint) {
        if (KONF.ENDPOINT) {
            catatanEndpoint.hidden = true;
        } else {
            catatanEndpoint.hidden = false;
            catatanEndpoint.innerHTML = 'Endpoint belum diisi, jadi form ini <b>tidak bisa mengirim</b>. '
                + 'Buka <code>assets/kontribusi-config.js</code> dan isi <code>ENDPOINT</code>. '
                + 'Semua isian tetap ada di layar - jangan isi ulang.';
        }
    }
})();