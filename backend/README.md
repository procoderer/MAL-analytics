# Backend (Python + Flask)

This is a minimal Flask backend with a couple of example routes.

## Quickstart

1) (Optional) Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2) Install dependencies:

```bash
pip install -r requirements.txt
```

3) Run the server:

```bash
python app.py
```

Server will start on `http://127.0.0.1:5001`.

## Running tests

```bash
python -m pytest --cov=app --cov-report=term-missing
```
