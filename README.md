# Karma CRM — Member Relations Platform

An AI-powered CRM built specifically for resort membership and fractional ownership management.

---

## What's included

| Screen | What it does |
|---|---|
| Dashboard | Live pipeline, guest cards, profile panel, AI actions |
| All Members | Full guest list with filter and status management |
| Arrivals Today | Today's check-ins with upgrade scores |
| AI Generator | Welcome messages, meeting prep, follow-ups, proposals |
| Objection Handler | AI responses to any membership objection |
| Fee Calculator | 5/10/25-year maintenance fee projections |
| Fractional Compare | Side-by-side 10-year cost comparison |
| Pipeline View | All guests grouped by stage |

---

## Setup — step by step

### 1. Clone and install

```bash
git clone <your-repo-url>
cd karma-crm
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once created, go to **Settings → API**
3. Copy your **Project URL** and **anon public** key

### 3. Set up the database

1. In your Supabase dashboard → **SQL Editor → New Query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run** — this creates all tables and seeds the 6 demo guests

### 4. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in → **API Keys → Create Key**
3. Copy the key (starts with `sk-ant-`)

> **Cost note:** Each AI message generation costs roughly $0.002–0.01. For typical daily use (10–20 messages/day), expect $5–20/month.

### 5. Create your .env file

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_ANTHROPIC_API_KEY=sk-ant-your_key_here
```

### 6. Run locally

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (5 minutes)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In **Environment Variables**, add:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_ANTHROPIC_API_KEY`
4. Click **Deploy**

Your CRM will be live at `https://your-project.vercel.app`

---

## Secure your API key (recommended for production)

The current setup calls the Anthropic API directly from the browser (fine for personal/team use). For a more secure setup, proxy it through a Supabase Edge Function:

1. Create a new Edge Function in Supabase: `supabase/functions/generate-message/index.ts`
2. Move the API call there
3. Update `src/lib/claude.js` to call your Edge Function instead

This keeps your API key server-side and off the client entirely.

---

## Project structure

```
karma-crm/
├── public/
│   └── index.html              # HTML shell with fonts
├── src/
│   ├── App.jsx                 # Root: routing, sidebar, topbar
│   ├── index.js                # React entry point
│   ├── index.css               # Design tokens + global styles
│   ├── components/
│   │   ├── UI.jsx              # Shared components (Button, Card, Modal...)
│   │   ├── GuestCard.jsx       # Guest list card
│   │   ├── GuestProfile.jsx    # Right panel with AI actions
│   │   └── AddGuestModal.jsx   # Add guest form
│   ├── screens/
│   │   ├── Dashboard.jsx       # Main dashboard screen
│   │   └── Tools.jsx           # Objections, Calculator, Comparison, AI Tools
│   ├── hooks/
│   │   ├── useGuests.js        # Guest CRUD + real-time Supabase
│   │   └── useAI.js            # AI generation state management
│   └── lib/
│       ├── supabase.js         # Supabase client + all DB queries
│       └── claude.js           # All Claude AI prompts + API calls
├── supabase/
│   └── schema.sql              # Full DB schema + seed data
├── .env.example                # Environment variable template
├── vercel.json                 # Vercel SPA routing
└── package.json
```

---

## Customizing for your property

**Change the staff name:** Search for `James Reid` in `App.jsx` and `src/lib/claude.js`

**Change the property name:** Search for `Karma Kandara` in `src/lib/claude.js`

**Add more membership types:** Edit the `MEMBER_TYPES` array in `AddGuestModal.jsx`

**Adjust AI tone:** Edit the prompt templates in `src/lib/claude.js`

**Add team members:** Insert more rows into the `staff` table in Supabase

---

## Roadmap / next features

- [ ] Supabase Auth (login per staff member)
- [ ] WhatsApp Business API integration (one-click send)
- [ ] Email integration via SendGrid or Resend
- [ ] Voice note → AI summary (Whisper API)
- [ ] Conversion analytics dashboard
- [ ] Automated follow-up sequences
- [ ] Mobile-optimized view for resort floor use
