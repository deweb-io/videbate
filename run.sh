#!/bin/bash -eu

# Run a local CORS Web server with no cache to serve the local files.
python3 -c'
from http.server import HTTPServer, SimpleHTTPRequestHandler
class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        if self.path.endswith(".js"):
            self.send_header("Content-Type", "application/javascript")
        SimpleHTTPRequestHandler.end_headers(self)
HTTPServer(("", 8000), CORSRequestHandler).serve_forever()'

# Bring the frontend server to the foreground once the python server is done.
fg

exit 0
