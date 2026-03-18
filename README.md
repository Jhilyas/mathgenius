# 🧮 MathGenius — Plateforme Math Éducative

Advanced educational math platform with AI tutoring powered by Google Gemma 3.

## Features

- 🤖 **AI Tutor** — Chat with an AI math tutor (Google Gemma 3 via OpenRouter)
- 🧮 **Scientific Calculator** — Full calculator with history persistence
- 📊 **Graphing** — Plot mathematical functions
- 📐 **Geometry** — Interactive geometry tools
- 🧩 **Quiz Generator** — AI-generated math quizzes
- 🔄 **Unit Converter** — Convert between units
- 📝 **Equation Solver** — Solve linear and quadratic equations
- 📋 **Formulas** — Common math formulas reference
- 🌍 **Multi-language** — French, English, Arabic, Spanish
- 📱 **Responsive** — Works on PC, tablet, and phone

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **AI**: OpenRouter API (Google Gemma 3)
- **Storage**: Supabase (PostgreSQL)
- **Design**: Glassmorphism UI

## Quick Start

```bash
# Clone
git clone https://github.com/Jhilyas/mathgenius.git
cd mathgenius

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your OpenRouter API key

# Run
npm start
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (production/development) | No |
| `APP_URL` | Your deployed app URL | No |

## Deploy

### Render
1. Connect your GitHub repo
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `npm start`
4. Add environment variables in Render dashboard
5. Deploy!

### Railway
1. Connect your GitHub repo
2. Add environment variables
3. Railway auto-detects Node.js and deploys

### Fly.io
```bash
fly launch
fly secrets set OPENROUTER_API_KEY=your_key
fly deploy
```

## License

MIT
