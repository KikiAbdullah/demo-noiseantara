/* =============================================================================
 * KONTRIBUSI - KONFIGURASI ENDPOINT
 * =============================================================================
 *
 * Satu-satunya berkas yang perlu kamu sentuh kalau form kontribusi tidak mau
 * mengirim ke mana pun.
 *
 * GANTI `ENDPOINT` dengan URL web app Google Apps Script yang berakhiran /exec
 * (Deploy -> New deployment -> Web app -> Who has access: Anyone).
 *
 * PENTING - kenapa tidak ada API key / token di sini:
 * Demo ini statis dan disajikan lewat github.io. Apa pun yang ditulis di file ini
 * atau di file JS lain bisa dibaca siapa pun yang membuka View Source. Karena itu
 * tidak ada rahasia yang boleh disimpan di repo. Endpoint Apps Script tidak
 * memegang kredensial apa pun - ia cuma menulis ke Sheet dan Drive milikmu, dan
 * siapa pun boleh mengirim ke sana. Kalau suatu saat butuh membatasi pengirim,
 * jawabannya ada di sisi Apps Script (ValidasiClient / kuota / captcha), bukan
 * dengan menyembunyikan token di sini.
 * ========================================================================== */

window.KONTRIBUSI = window.KONTRIBUSI || {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzKyRLryMIMxG-MwgQYqO5N5-FBhwsDpcas95LrRe29B-S1FL7Lvqbi8-_4EkZsI5BqNQ/exec',

  /* Paket data dibatasi agar muat di kuota Apps Script (batas POST ~50 MB).
     Gambar dikompres di peramban sebelum di-encode base64. */
  BATAS: {
    GAMBAR_MB: 8,
    AUDIO_MB: 10,
    TOTAL_MB: 35,
    SISI_MAKS: 1800,   // piksel terpanjang setelah dikompres
    JPEG_MUTU: 0.85,
  },

  /* Nama sheet tujuan untuk catatan fallback bila endpoint gagal. */
  NAMA_SHEET: 'Pengiriman',
};