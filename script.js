const AVATAR_DEFAULT = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const UKURAN_AVATAR_MAX = 320;
const UKURAN_FILE_MAX_MB = 5;
const API_URL = '/api/data';

let daftarTransaksi = [];
let dataProfil = {
    nama: 'Pengguna Money Tracking',
    kelamin: '',
    avatar: AVATAR_DEFAULT
};
let daftarKategoriCustom = [];
let temaAktif = 'terang';
let databaseSiap = false;

let indeksSlider = 0;
let jenisAktif = 'pengeluaran';
let sumberRiwayatAktif = 'offline';
let sumberDanaAktif = 'offline';
let kategoriTerpilih = '';
let ikonTerpilih = 'fa-heart';
let jenisGrafikAktif = 'pengeluaran';
let bulanGrafikAktif = new Date().getMonth();
let indeksEdit = null;
let grafikDonat = null;
let grafikGaris = null;

const daftarIkonKategori = {
    'Parkir':'fa-car', 'Uang':'fa-money', 'Internet':'fa-wifi', 'Bensin':'fa-tint',
    'Belanja':'fa-shopping-bag', 'Makanan':'fa-cutlery', 'Pulsa':'fa-mobile', 'Hiburan':'fa-gamepad',
    'Pendidikan':'fa-book', 'Gaji':'fa-briefcase', 'Hadiah':'fa-gift', 'Transportasi':'fa-car',
    'Kesehatan':'fa-medkit', 'Pribadi':'fa-user', 'Kantor':'fa-briefcase', 'Olahraga':'fa-heartbeat',
    'Festival':'fa-gift', 'Keuangan':'fa-bank', 'Perjalanan':'fa-plane'
};

const warnaKategori = {
    'Parkir':'#4285F4', 'Uang':'#0F9D58', 'Internet':'#FF9800', 'Bensin':'#FF5722',
    'Belanja':'#FBC02D', 'Makanan':'#26A69A', 'Pulsa':'#EC407A', 'Hiburan':'#673AB7',
    'Pendidikan':'#9C27B0', 'Gaji':'#00B42A', 'Hadiah':'#E91E63', 'Transportasi':'#FF9800',
    'Kesehatan':'#F44336', 'Pribadi':'#3F51B5', 'Kantor':'#607D8B', 'Olahraga':'#8BC34A',
    'Festival':'#FFC107', 'Keuangan':'#2196F3', 'Perjalanan':'#00BCD4'
};

function formatTanggalLengkap(tanggalISO) {
    const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tgl = new Date(tanggalISO);
    return `${hari[tgl.getDay()]} ${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
}

function ambilDigitNominal(nilai) {
    return String(nilai ?? '').replace(/\D/g, '');
}

function formatNominalTitik(nilai) {
    const digit = ambilDigitNominal(nilai).replace(/^0+(?=\d)/, '');
    if (!digit) return '';
    return digit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function keBigInt(nilai) {
    const digit = ambilDigitNominal(nilai);
    if (!digit) return 0n;
    try {
        return BigInt(digit);
    } catch {
        return 0n;
    }
}

function formatRupiah(angka) {
    try {
        const bi = typeof angka === 'bigint' ? angka : BigInt(String(angka).replace(/[^\d-]/g, '') || '0');
        const negatif = bi < 0n;
        const absolut = negatif ? -bi : bi;
        const titik = absolut.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${negatif ? '-' : ''}Rp${titik}`;
    } catch {
        return 'Rp0';
    }
}

function keAngkaGrafik(nilai) {
    const bi = typeof nilai === 'bigint' ? nilai : keBigInt(nilai);
    const sebagaiNumber = Number(bi);
    return Number.isFinite(sebagaiNumber) ? sebagaiNumber : Number.MAX_SAFE_INTEGER;
}

function ambilPayloadDatabase() {
    return {
        transaksi: daftarTransaksi,
        profil: dataProfil,
        kategoriCustom: daftarKategoriCustom,
        tema: temaAktif
    };
}

async function simpanKeDatabase() {
    if (!databaseSiap) return;
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ambilPayloadDatabase())
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menyimpan ke money.json');
    }
}

function jadwalkanSimpan() {
    simpanKeDatabase().catch(err => {
        console.error(err);
        alert(err.message || 'Gagal menyimpan data ke money.json. Pastikan server.py sedang berjalan.');
    });
}

function simpanData() { jadwalkanSimpan(); }
function simpanProfil() {
    return simpanKeDatabase().catch(err => {
        throw new Error(err.message || 'Gagal menyimpan foto. Coba pakai gambar yang lebih kecil.');
    });
}
function simpanKategori() { jadwalkanSimpan(); }

async function muatDariDatabase() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Gagal membaca money.json');
    const data = await res.json();

    daftarTransaksi = Array.isArray(data.transaksi) ? data.transaksi : [];
    dataProfil = data.profil || {
        nama: 'Pengguna Money Tracking',
        kelamin: '',
        avatar: AVATAR_DEFAULT
    };
    if (!dataProfil.avatar) dataProfil.avatar = AVATAR_DEFAULT;
    daftarKategoriCustom = Array.isArray(data.kategoriCustom) ? data.kategoriCustom : [];
    temaAktif = data.tema || 'terang';

    // Migrasi sekali dari localStorage lama jika money.json masih kosong
    const lokalTransaksi = JSON.parse(localStorage.getItem('dataKeuangan') || '[]');
    const lokalProfil = JSON.parse(localStorage.getItem('dataProfil') || 'null');
    const lokalKategori = JSON.parse(localStorage.getItem('kategoriCustom') || '[]');
    const perluMigrasi = daftarTransaksi.length === 0 && (
        (Array.isArray(lokalTransaksi) && lokalTransaksi.length > 0) ||
        lokalProfil ||
        (Array.isArray(lokalKategori) && lokalKategori.length > 0)
    );

    if (perluMigrasi) {
        if (Array.isArray(lokalTransaksi) && lokalTransaksi.length) daftarTransaksi = lokalTransaksi;
        if (lokalProfil) dataProfil = { ...dataProfil, ...lokalProfil };
        if (Array.isArray(lokalKategori) && lokalKategori.length) daftarKategoriCustom = lokalKategori;
        const temaLokal = localStorage.getItem('temaPilihan');
        if (temaLokal) temaAktif = temaLokal;
    }

    databaseSiap = true;
    if (perluMigrasi) await simpanKeDatabase();
}

function hitungSaldo() {
    let off = 0n, ewal = 0n;
    daftarTransaksi.forEach(t => {
        const jml = keBigInt(t.jumlah);
        if (t.sumber === 'offline') {
            t.jenis === 'pemasukan' ? off += jml : off -= jml;
        } else {
            t.jenis === 'pemasukan' ? ewal += jml : ewal -= jml;
        }
    });
    document.getElementById('saldoOffline').textContent = formatRupiah(off);
    document.getElementById('saldoEwallet').textContent = formatRupiah(ewal);
    return {off, ewal};
}

function aturTema(namaTema, simpan = true) {
    const htmlEl = document.documentElement;
    const ikon = document.getElementById('ikonSwitch');
    temaAktif = namaTema;
    if (namaTema === 'terang') {
        htmlEl.removeAttribute('data-tema');
        ikon.className = 'fa fa-sun-o ikon-switch';
    } else {
        htmlEl.setAttribute('data-tema', 'gelap');
        ikon.className = 'fa fa-moon-o ikon-switch';
    }
    if (simpan) jadwalkanSimpan();
}

function hapusTransaksi(index) {
    if(confirm('Yakin ingin menghapus transaksi ini?')) {
        daftarTransaksi.splice(index, 1);
        simpanData();
        updateRiwayat();
        updateLaporan();
        updateGrafik();
    }
}

function editTransaksi(index) {
    indeksEdit = index;
    const t = daftarTransaksi[index];
    
    document.getElementById('judulModalTransaksi').textContent = 'Ubah Transaksi';
    document.getElementById('jumlah').value = formatNominalTitik(t.jumlah);
    document.getElementById('catatan').value = t.catatan;

    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('aktif'));
    document.querySelector(`[data-tab="${t.jenis}"]`).classList.add('aktif');
    jenisAktif = t.jenis;

    document.querySelectorAll('[data-sumber]').forEach(b => b.classList.remove('aktif'));
    document.querySelector(`[data-sumber="${t.sumber}"]`).classList.add('aktif');
    sumberDanaAktif = t.sumber;

    setTimeout(() => {
        document.querySelectorAll('.daftar-kategori .item-kategori').forEach(k => k.classList.remove('aktif'));
        document.querySelector(`[data-kat="${t.kategori}"]`)?.classList.add('aktif');
        kategoriTerpilih = t.kategori;
    }, 50);

    document.getElementById('modalTambah').classList.add('terbuka');
}

function muatSemuaKategori() {
    const wadah = document.querySelector('.daftar-kategori');
    wadah.innerHTML = '';

    Object.keys(daftarIkonKategori).forEach(nama => {
        wadah.innerHTML += `
            <div class="item-kategori" data-kat="${nama}">
                <i class="fa ${daftarIkonKategori[nama]}"></i>
                <span>${nama}</span>
            </div>
        `;
    });

    daftarKategoriCustom.forEach(kat => {
        daftarIkonKategori[kat.nama] = kat.ikon;
        warnaKategori[kat.nama] = '#94A3B8';
        wadah.innerHTML += `
            <div class="item-kategori" data-kat="${kat.nama}">
                <i class="fa ${kat.ikon}"></i>
                <span>${kat.nama}</span>
            </div>
        `;
    });

    wadah.innerHTML += `
        <div class="item-kategori" data-kat="tambah" id="btnTambahKategori">
            <i class="fa fa-plus-circle"></i>
            <span>Tambah</span>
        </div>
    `;
    pasangEventKategori();
}

function pasangEventKategori() {
    document.querySelectorAll('.daftar-kategori .item-kategori').forEach(item => {
        item.addEventListener('click', () => {
            if(item.dataset.kat === 'tambah') {
                document.getElementById('modalKategori').classList.add('terbuka');
                return;
            }
            kategoriTerpilih = item.dataset.kat;
            document.querySelectorAll('.daftar-kategori .item-kategori').forEach(k=>k.classList.remove('aktif'));
            item.classList.add('aktif');
        });
    });
}

function updateRiwayat() {
    hitungSaldo();
    const el = document.getElementById('daftarTransaksi');
    let daftarFilter = daftarTransaksi.filter(t => t.sumber === sumberRiwayatAktif);
    daftarFilter.sort((a,b) => new Date(b.waktu) - new Date(a.waktu));

    if(daftarFilter.length === 0) {
        el.innerHTML = `<div class="kosong"><i class="fa fa-folder-open"></i><p>Belum ada transaksi</p></div>`;
        return;
    }

    el.innerHTML = daftarFilter.map((t) => {
        const idx = daftarTransaksi.indexOf(t);
        const judul = t.catatan && t.catatan.trim() !== '' ? t.catatan : t.kategori;
        return `
        <div class="item-transaksi" onclick="editTransaksi(${idx})">
            <div class="ikon-transaksi" style="background:${(warnaKategori[t.kategori]||'#94A3B8')}15; color:${warnaKategori[t.kategori]||'#94A3B8'};">
                <i class="fa ${daftarIkonKategori[t.kategori]||'fa-tag'}"></i>
            </div>
            <div class="info-transaksi">
                <div class="nama-kategori">${judul}</div>
                <div class="tanggal-transaksi">${formatTanggalLengkap(t.waktu)}</div>
            </div>
            <div class="jumlah ${t.jenis==='pemasukan'?'text-pemasukan':'text-pengeluaran'}">
                ${t.jenis==='pemasukan'?'+':'-'}${formatRupiah(t.jumlah)}
            </div>
            <button class="btn-hapus" onclick="event.stopPropagation(); hapusTransaksi(${idx})"><i class="fa fa-trash"></i></button>
        </div>
        `;
    }).join('');
}

function updateLaporan() {
    const {off, ewal} = hitungSaldo();
    const total = off + ewal;
    document.getElementById('lapOffline').textContent = formatRupiah(off);
    document.getElementById('lapEwallet').textContent = formatRupiah(ewal);
    document.getElementById('lapTotal').textContent = formatRupiah(total);

    const sekarang = new Date();
    let totalMasuk = 0n, totalKeluar = 0n;
    daftarTransaksi.forEach(t => {
        const tgl = new Date(t.waktu);
        if(tgl.getMonth() === sekarang.getMonth() && tgl.getFullYear() === sekarang.getFullYear()) {
            const jml = keBigInt(t.jumlah);
            if(t.jenis === 'pemasukan') totalMasuk += jml;
            else totalKeluar += jml;
        }
    });

    document.getElementById('lapMasuk').textContent = formatRupiah(totalMasuk);
    document.getElementById('lapKeluar').textContent = formatRupiah(totalKeluar);
    const selisih = totalMasuk - totalKeluar;
    const elSelisih = document.getElementById('lapSelisih');
    elSelisih.textContent = formatRupiah(selisih);
    elSelisih.className = selisih >= 0n ? 'text-pemasukan' : 'text-pengeluaran';

    const jumlahHari = BigInt(sekarang.getDate() || 1);
    document.getElementById('lapRataKeluar').textContent = formatRupiah(totalKeluar / jumlahHari);
    document.getElementById('lapRataMasuk').textContent = formatRupiah(totalMasuk / jumlahHari);
}

function ubahSlider(arah) {
    indeksSlider = (indeksSlider + arah + 2) % 2;
    document.getElementById('sliderGrafik').style.transform = `translateX(-${indeksSlider * 100}%)`;
    document.querySelectorAll('.titik-indikator').forEach((t,i) => t.classList.toggle('aktif', i === indeksSlider));
    updateGrafik();
}

function updateProfil() {
    const srcAvatar = dataProfil.avatar || AVATAR_DEFAULT;
    document.getElementById('namaProfil').textContent = dataProfil.nama;
    document.getElementById('kelaminProfil').textContent = dataProfil.kelamin || 'Belum diatur';
    document.getElementById('avatarProfil').src = srcAvatar;
    const previewModal = document.getElementById('previewAvatarModal');
    if (previewModal) previewModal.src = srcAvatar;
}

function kompresGambar(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('File harus berupa gambar.'));
            return;
        }
        if (file.size > UKURAN_FILE_MAX_MB * 1024 * 1024) {
            reject(new Error(`Ukuran foto maksimal ${UKURAN_FILE_MAX_MB} MB.`));
            return;
        }

        const pembaca = new FileReader();
        pembaca.onerror = () => reject(new Error('Gagal membaca file foto.'));
        pembaca.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const skala = Math.min(1, UKURAN_AVATAR_MAX / Math.max(width, height));
                width = Math.round(width * skala);
                height = Math.round(height * skala);
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = pembaca.result;
        };
        pembaca.readAsDataURL(file);
    });
}

async function prosesGantiAvatar(file) {
    const avatarLama = dataProfil.avatar;
    try {
        const hasil = await kompresGambar(file);
        dataProfil.avatar = hasil;
        await simpanProfil();
        updateProfil();
    } catch (err) {
        dataProfil.avatar = avatarLama;
        updateProfil();
        alert(err.message || 'Gagal mengganti foto profil.');
    }
}

function bukaPemilihFoto() {
    const input = document.getElementById('inputAvatar');
    input.value = '';
    input.click();
}

function resetAvatarDefault() {
    dataProfil.avatar = AVATAR_DEFAULT;
    simpanProfil().then(updateProfil).catch(err => alert(err.message));
}

function updateGrafik() {
    const dataBulan = daftarTransaksi.filter(t => {
        const tgl = new Date(t.waktu);
        return tgl.getMonth() === bulanGrafikAktif && t.jenis === jenisGrafikAktif;
    });

    const kategoriData = {};
    const harianData = Array(31).fill(0);

    dataBulan.forEach(t => {
        const tgl = new Date(t.waktu).getDate();
        const jml = keAngkaGrafik(t.jumlah);
        harianData[tgl-1] += jml;
        if(!kategoriData[t.kategori]) kategoriData[t.kategori] = 0;
        kategoriData[t.kategori] += jml;
    });

    const labelHarian = Array.from({length:31}, (_,i) => i+1);

    if(grafikDonat) grafikDonat.destroy();
    if(grafikGaris) grafikGaris.destroy();

    grafikDonat = new Chart(document.getElementById('grafikKategori'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(kategoriData),
            datasets: [{
                data: Object.values(kategoriData),
                backgroundColor: Object.keys(kategoriData).map(k => warnaKategori[k] || '#94A3B8'),
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    grafikGaris = new Chart(document.getElementById('grafikHarian'), {
        type: 'line',
        data: {
            labels: labelHarian,
            datasets: [{
                label: jenisGrafikAktif === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan',
                data: harianData,
                borderColor: jenisGrafikAktif === 'pengeluaran' ? '#F53F3F' : '#00B42A',
                backgroundColor: (jenisGrafikAktif === 'pengeluaran' ? '#F53F3F15' : '#00B42A15'),
                fill: true, tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await muatDariDatabase();
    } catch (err) {
        console.error(err);
        alert('Tidak bisa membaca money.json.\nJalankan dulu file jalankan.bat atau: py server.py\nlalu buka http://127.0.0.1:5500');
        return;
    }

    aturTema(temaAktif, false);
    updateProfil();
    muatSemuaKategori();
    updateRiwayat();
    updateLaporan();
    updateGrafik();

    // Tombol Tema
    document.getElementById('toggleTema').addEventListener('click', () => {
        const temaSekarang = document.documentElement.getAttribute('data-tema') === 'gelap' ? 'gelap' : 'terang';
        aturTema(temaSekarang === 'gelap' ? 'terang' : 'gelap');
    });

    // Navigasi Bawah
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('aktif'));
            document.querySelectorAll('.halaman').forEach(h => h.classList.remove('aktif'));
            item.classList.add('aktif');
            document.getElementById(`halaman${item.dataset.halaman}`).classList.add('aktif');
            if(item.dataset.halaman === 'Laporan') updateLaporan();
            if(item.dataset.halaman === 'Grafik') setTimeout(updateGrafik, 100);
        });
    });

    // Tab Riwayat
    document.getElementById('btnRiwayatOffline').addEventListener('click', () => {
        sumberRiwayatAktif = 'offline';
        document.getElementById('btnRiwayatOffline').classList.add('aktif');
        document.getElementById('btnRiwayatEwallet').classList.remove('aktif');
        updateRiwayat();
    });

    document.getElementById('btnRiwayatEwallet').addEventListener('click', () => {
        sumberRiwayatAktif = 'ewallet';
        document.getElementById('btnRiwayatEwallet').classList.add('aktif');
        document.getElementById('btnRiwayatOffline').classList.remove('aktif');
        updateRiwayat();
    });

    // Buka/Tutup Modal Transaksi
    document.getElementById('btnBukaTambah').addEventListener('click', () => {
        indeksEdit = null;
        document.getElementById('judulModalTransaksi').textContent = 'Tambah Transaksi';
        document.getElementById('modalTambah').classList.add('terbuka');
        jenisAktif = 'pengeluaran';
        sumberDanaAktif = 'offline';
        kategoriTerpilih = '';
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('aktif'));
        document.querySelector('[data-tab="pengeluaran"]').classList.add('aktif');
        document.querySelectorAll('[data-sumber]').forEach(b => b.classList.remove('aktif'));
        document.querySelector('[data-sumber="offline"]').classList.add('aktif');
        document.querySelectorAll('.daftar-kategori .item-kategori').forEach(k => k.classList.remove('aktif'));
        document.getElementById('jumlah').value = '';
        document.getElementById('catatan').value = '';
    });

    document.getElementById('btnTutupModal').addEventListener('click', () => {
        document.getElementById('modalTambah').classList.remove('terbuka');
        indeksEdit = null;
    });

    // Tab Jenis Transaksi
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            jenisAktif = btn.dataset.tab;
            document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('aktif'));
            btn.classList.add('aktif');
        });
    });

    // Tab Sumber Dana
    document.querySelectorAll('[data-sumber]').forEach(btn => {
        btn.addEventListener('click', () => {
            sumberDanaAktif = btn.dataset.sumber;
            document.querySelectorAll('[data-sumber]').forEach(b => b.classList.remove('aktif'));
            btn.classList.add('aktif');
        });
    });

    // Tab Grafik & Pilih Bulan
    document.getElementById('btnGrafikPengeluaran').addEventListener('click', () => {
        jenisGrafikAktif = 'pengeluaran';
        document.getElementById('btnGrafikPengeluaran').classList.add('aktif');
        document.getElementById('btnGrafikPemasukan').classList.remove('aktif');
        updateGrafik();
    });

    document.getElementById('btnGrafikPemasukan').addEventListener('click', () => {
        jenisGrafikAktif = 'pemasukan';
        document.getElementById('btnGrafikPemasukan').classList.add('aktif');
        document.getElementById('btnGrafikPengeluaran').classList.remove('aktif');
        updateGrafik();
    });

    document.querySelectorAll('.daftar-bulan span').forEach(el => {
        el.addEventListener('click', () => {
            bulanGrafikAktif = parseInt(el.dataset.bulan);
            document.querySelectorAll('.daftar-bulan span').forEach(s => s.classList.remove('aktif'));
            el.classList.add('aktif');
            updateGrafik();
        });
    });

    // Simpan Transaksi
    document.getElementById('btnSimpanTransaksi').addEventListener('click', () => {
        const jumlahStr = ambilDigitNominal(document.getElementById('jumlah').value).replace(/^0+(?=\d)/, '');
        const catatan = document.getElementById('catatan').value.trim();
        if(!jumlahStr || keBigInt(jumlahStr) <= 0n || !kategoriTerpilih) {
            alert('Harap isi jumlah dan pilih kategori!');
            return;
        }

        if(indeksEdit !== null) {
            daftarTransaksi[indeksEdit].jenis = jenisAktif;
            daftarTransaksi[indeksEdit].sumber = sumberDanaAktif;
            daftarTransaksi[indeksEdit].jumlah = jumlahStr;
            daftarTransaksi[indeksEdit].kategori = kategoriTerpilih;
            daftarTransaksi[indeksEdit].catatan = catatan;
        } else {
            daftarTransaksi.push({
                jenis: jenisAktif,
                sumber: sumberDanaAktif,
                jumlah: jumlahStr,
                kategori: kategoriTerpilih,
                catatan: catatan,
                waktu: new Date().toISOString()
            });
        }

        simpanData();
        updateRiwayat();
        updateLaporan();
        updateGrafik();
        document.getElementById('modalTambah').classList.remove('terbuka');
        indeksEdit = null;
    });

    // === NOMINAL CUSTOM TAK TERBATAS + TITIK OTOMATIS ===
    const inputJumlah = document.getElementById('jumlah');
    inputJumlah.addEventListener('input', function () {
        const digit = ambilDigitNominal(this.value);
        this.value = formatNominalTitik(digit);
    });
    inputJumlah.addEventListener('paste', function (e) {
        e.preventDefault();
        const teks = (e.clipboardData || window.clipboardData).getData('text');
        this.value = formatNominalTitik(ambilDigitNominal(teks));
    });

    // Slider Grafik
    document.querySelectorAll('.titik-indikator').forEach(titik => {
        titik.addEventListener('click', () => {
            indeksSlider = parseInt(titik.dataset.indeks);
            ubahSlider(0);
        });
    });

    let sentuhAwal = 0, sentuhAkhir = 0;
    const sliderEl = document.getElementById('sliderGrafik');
    if(sliderEl) {
        sliderEl.addEventListener('touchstart', e => sentuhAwal = e.touches[0].clientX);
        sliderEl.addEventListener('touchend', e => {
            sentuhAkhir = e.changedTouches[0].clientX;
            if(Math.abs(sentuhAwal - sentuhAkhir) > 50) {
                ubahSlider(sentuhAwal > sentuhAkhir ? 1 : -1);
            }
        });
    }

    // Modal Kategori
    document.getElementById('btnTutupKategori').addEventListener('click', () => {
        document.getElementById('modalKategori').classList.remove('terbuka');
    });

    document.querySelectorAll('#pilihIkon .item-kategori').forEach(i => {
        i.addEventListener('click', () => {
            ikonTerpilih = i.dataset.ikon;
            document.querySelectorAll('#pilihIkon .item-kategori').forEach(x => x.classList.remove('aktif'));
            i.classList.add('aktif');
        });
    });

    document.getElementById('btnSimpanKategori').addEventListener('click', () => {
        const nama = document.getElementById('namaKategoriBaru').value.trim();
        if(!nama) {
            alert('Masukkan nama kategori!');
            return;
        }
        daftarKategoriCustom.push({ nama: nama, ikon: ikonTerpilih });
        simpanKategori();
        muatSemuaKategori();
        updateGrafik();
        document.getElementById('modalKategori').classList.remove('terbuka');
        document.getElementById('namaKategoriBaru').value = '';
    });

    // Ganti Foto Profil (custom dari galeri/kamera)
    document.getElementById('btnGantiAvatar').addEventListener('click', (e) => {
        e.stopPropagation();
        bukaPemilihFoto();
    });
    document.getElementById('btnGantiFoto').addEventListener('click', bukaPemilihFoto);
    document.getElementById('areaAvatar').addEventListener('click', bukaPemilihFoto);
    document.getElementById('btnPilihFotoModal').addEventListener('click', bukaPemilihFoto);
    document.getElementById('btnResetFoto').addEventListener('click', () => {
        if (confirm('Kembalikan foto profil ke default?')) resetAvatarDefault();
    });

    document.getElementById('inputAvatar').addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) prosesGantiAvatar(file);
    });

    document.getElementById('btnEditProfil').addEventListener('click', () => {
        document.getElementById('inputNama').value = dataProfil.nama;
        document.getElementById('inputKelamin').value = dataProfil.kelamin;
        updateProfil();
        document.getElementById('modalProfil').classList.add('terbuka');
    });

    document.getElementById('btnTutupProfil').addEventListener('click', () => {
        document.getElementById('modalProfil').classList.remove('terbuka');
    });

    document.getElementById('btnSimpanProfil').addEventListener('click', async () => {
        dataProfil.nama = document.getElementById('inputNama').value.trim() || 'Pengguna Money Tracking';
        dataProfil.kelamin = document.getElementById('inputKelamin').value;
        try {
            await simpanProfil();
            updateProfil();
            document.getElementById('modalProfil').classList.remove('terbuka');
        } catch (err) {
            alert(err.message || 'Gagal menyimpan profil.');
        }
    });
});