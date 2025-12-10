#!/usr/bin/env python3
"""Production server that serves both Flask API and React frontend static files."""
import os
from flask import Flask, send_from_directory
from backend.app import create_app

app = create_app()

# Health check endpoint
@app.route("/health")
def health():
    return {"status": "ok", "message": "Server is running"}

# Serve static files from frontend/dist in production
static_folder = os.path.join(os.getcwd(), "frontend", "dist")

if os.path.exists(static_folder):
    print(f"✓ Static folder found at: {static_folder}")
    
    # Serve static assets (JS, CSS, images, etc. from assets folder)
    @app.route("/assets/<path:filename>")
    def serve_assets(filename):
        assets_path = os.path.join(static_folder, "assets", filename)
        if os.path.exists(assets_path):
            return send_from_directory(os.path.join(static_folder, "assets"), filename)
        print(f"Asset not found: {assets_path}")
        return {"error": "Not Found"}, 404
    
    # Root route - serve index.html
    @app.route("/")
    def serve_index():
        index_path = os.path.join(static_folder, "index.html")
        if os.path.exists(index_path):
            return send_from_directory(static_folder, "index.html")
        return {"error": "index.html not found"}, 500
    
    # Catch-all route for SPA - must be registered after API routes
    # Flask matches routes in registration order, so API routes will be matched first
    @app.route("/<path:path>")
    def serve_spa(path):
        # If this is an API route that wasn't matched, return 404
        # (API routes should have been matched already by Flask)
        if path.startswith("api/"):
            return {"error": "Not Found"}, 404
        
        # Try to serve static file if it exists
        file_path = os.path.join(static_folder, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(static_folder, path)
        
        # Default to index.html for SPA client-side routing
        index_path = os.path.join(static_folder, "index.html")
        if os.path.exists(index_path):
            return send_from_directory(static_folder, "index.html")
        return {"error": "index.html not found"}, 500
else:
    # If static folder doesn't exist, log warning
    print(f"✗ WARNING: Static folder not found at {static_folder}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir('.')}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Starting server on port {port}")
    print(f"Static folder: {static_folder}")
    print(f"Static folder exists: {os.path.exists(static_folder)}")
    if os.path.exists(static_folder):
        print(f"Static folder contents: {os.listdir(static_folder)}")
    app.run(host="0.0.0.0", port=port, debug=False)

