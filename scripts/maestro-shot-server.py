#!/usr/bin/env python3
"""Tiny local screenshot helper for Maestro flows.

Maestro's own takeScreenshot fails on photo-heavy screens (poster grids): the
PNG exceeds the 4 MB gRPC limit (RESOURCE_EXHAUSTED). Flows use
.maestro/subflows/shot.yaml for those screens; it calls this server, which
grabs the screen with `adb exec-out screencap -p` instead.

Usage: maestro-shot-server.py <device> <dir-file> [port]
  <dir-file>: text file holding the directory the next shots are written to
              (scripts/maestro-all.sh rewrites it before every flow).
"""
import subprocess
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

DEVICE, DIR_FILE = sys.argv[1], sys.argv[2]
PORT = int(sys.argv[3]) if len(sys.argv) > 3 else 8765


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = "".join(c for c in query.get("name", ["shot"])[0] if c.isalnum() or c in "-_.")
        try:
            out_dir = open(DIR_FILE).read().strip()
            png = subprocess.run(
                ["adb", "-s", DEVICE, "exec-out", "screencap", "-p"],
                capture_output=True, check=True, timeout=30,
            ).stdout
            with open(f"{out_dir}/{name}.png", "wb") as fh:
                fh.write(png)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        except Exception as exc:  # noqa: BLE001
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(exc).encode())

    def log_message(self, *args):
        pass


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
