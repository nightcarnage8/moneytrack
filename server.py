#!/usr/bin/env python3
"""Server lokal Money Tracker — menyimpan data ke money.json."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "money.json"
PORT = 5500

DEFAULT_DATA = {
    "transaksi": [],
    "profil": {
        "nama": "Pengguna Money Tracking",
        "kelamin": "",
        "avatar": "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    "kategoriCustom": [],
    "tema": "terang",
}


def baca_data():
    if not DATA_FILE.exists() or DATA_FILE.stat().st_size == 0:
        tulis_data(DEFAULT_DATA)
        return json.loads(json.dumps(DEFAULT_DATA))
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def tulis_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") == "/api/data":
            self._kirim_json(baca_data())
            return
        super().do_GET()

    def do_POST(self):
        if self.path.rstrip("/") != "/api/data":
            self.send_error(404)
            return
        try:
            panjang = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(panjang)
            data = json.loads(body.decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("Payload harus berupa objek JSON")
            tersimpan = {
                "transaksi": data.get("transaksi", []),
                "profil": data.get("profil", DEFAULT_DATA["profil"]),
                "kategoriCustom": data.get("kategoriCustom", []),
                "tema": data.get("tema", "terang"),
            }
            tulis_data(tersimpan)
            self._kirim_json({"ok": True})
        except Exception as err:
            pesan = json.dumps({"ok": False, "error": str(err)}).encode("utf-8")
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(pesan)))
            self.end_headers()
            self.wfile.write(pesan)

    def _kirim_json(self, objek):
        raw = json.dumps(objek, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))


if __name__ == "__main__":
    baca_data()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("=" * 50)
    print("  Money Tracker")
    print(f"  Buka: http://127.0.0.1:{PORT}")
    print("  Database: money.json")
    print("  Tekan Ctrl+C untuk berhenti")
    print("=" * 50)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        server.server_close()
