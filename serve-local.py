#!/usr/bin/env python3
"""
Simple HTTP server for testing WebPubSub locally
Serves files with proper CORS headers
"""

import http.server
import socketserver
import os

PORT = 8080

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print(f"Test page: http://localhost:{PORT}/test-pubsub-local.html")
    print(f"Main app: http://localhost:{PORT}/index.html")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()