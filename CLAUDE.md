# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI-powered Pokemon-style trading card generator. Users fill in a form (name, element, description, ability, weakness), and the backend uses Google Gemini to generate card stats (JSON) and an optional anime-style creature image.

## Tech Stack

- **Backend**: Python 3.12, Flask 3.1.0, Google Generative AI (Gemini)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Deployment**: Docker + Docker Compose, Caddy reverse proxy on external `web` network

## Commands

```bash
# Development (requires GEMINI_API_KEY in .env)
pip install -r requirements.txt
python app.py                    # Flask debug server on :5000

# Production
docker-compose up -d             # Gunicorn with 2 workers, 120s timeout
```

## Architecture

Stateless single-file Flask app (`app.py`) with two routes:

- `GET /` — serves `static/index.html`
- `POST /generate_card` — two-step AI generation:
  1. **Text**: `gemini-2.0-flash` generates card stats as JSON (HP, attacks, retreat cost, flavor text)
  2. **Image**: `gemini-2.0-flash-preview-image-generation` creates a creature illustration (optional, graceful fallback if it fails)

All frontend files live in `static/` — no bundler, no framework. The card preview is rendered client-side from the JSON response.

## Environment

- `GEMINI_API_KEY` — required, set in `.env` or passed via Docker environment
