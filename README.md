# DamageAI — Standalone Damage Detection App

AI-powered image damage detection. Upload or capture a photo and get instant analysis: damaged/not-damaged status, confidence score, severity level, damage type tags, and AI explanation.

**Powered by:** Groq Llama 4 Scout (free tier) · FastAPI · React · SQLite

---

## Quick Start

```bash
# 1 — Clone or move to the project folder
cd ~/Documents/damage-detector

# 2 — Configure AI provider
cp backend/.env.example backend/.env
# Edit backend/.env — set AI_API_KEY (see Provider Setup below)

# 3 — Launch everything
./start.sh
```

Open **http://localhost:5173** in your browser.

---

## Features

| Page | What it does |
|---|---|
| **Analyse** | Upload an image or use webcam → instant AI damage report |
| **Batch** | Upload up to 50 images → progress grid → export CSV report |
| **History** | Browse all past analyses, filter, delete |
| **Compare** | Side-by-side diff of any two past analyses |

---

## AI Provider Setup

The app is provider-agnostic — change 3 env vars to switch models:

```env
AI_API_KEY=your_key
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

### Provider options

| Provider | Free tier | Get key | Base URL | Model |
|---|---|---|---|---|
| **Groq** (default) | ✅ generous | [console.groq.com](https://console.groq.com) | `https://api.groq.com/openai/v1` | `meta-llama/llama-4-scout-17b-16e-instruct` |
| **Google Gemini** | ✅ 1500 req/day | [aistudio.google.com](https://aistudio.google.com) | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash` |
| **OpenAI** | ❌ paid | [platform.openai.com](https://platform.openai.com) | `https://api.openai.com/v1` | `gpt-4o-mini` |

---

## Configuration

All settings live in `backend/.env`:

```env
# AI provider
AI_API_KEY=gsk_...
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Tuning
DAMAGE_CONFIDENCE_THRESHOLD=65.0   # Below this → flagged for manual review
DAMAGE_IMAGE_MAX_PX=1024            # Images resized to this before sending to AI
DAMAGE_STORAGE_DIR=storage/images  # Where uploaded images are stored
```

---

## Project Structure

```
damage-detector/
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI app
│   │   ├── config.py        Settings
│   │   ├── database.py      SQLite setup (auto-creates tables)
│   │   └── damage/          All damage detection logic
│   ├── damage.db            SQLite database (auto-created)
│   ├── storage/images/      Uploaded image files
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           Analyse · Batch · History · Compare
│       └── components/      Shared UI components
├── start.sh                 One-command launcher
└── README.md
```

---

## Manual Start (without start.sh)

```bash
# Terminal 1 — Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

API docs: **http://localhost:8000/docs**
