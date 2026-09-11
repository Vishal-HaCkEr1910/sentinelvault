# SentinelVault — Frontend

React + TypeScript frontend for the SentinelVault secure document management system.

## Quick Start

```bash
npm install
npm run dev
```

App starts at `http://localhost:5173`. Backend must be running at `http://localhost:8000`.

## Demo Credentials

Password for all accounts: `password123`

| Username | Role |
|---|---|
| `admin` | Admin |
| `io_sharma` | InvestigatingOfficer |
| `io_verma` | InvestigatingOfficer |
| `fa_patel` | ForensicAnalyst |
| `prosecutor_rao` | Prosecutor |
| `judge_mehta` | Judge |
| `clerk_das` | Clerk |

## Stack

- React 18 + TypeScript
- React Router v6
- Zustand (auth state)
- TanStack Query (data fetching)
- shadcn/ui + Tailwind CSS
- React Hook Form + Zod
- Axios
- Sonner (toasts)

## Structure

```
src/
├── api/          # API call functions + TypeScript types
├── components/
│   ├── layout/   # AppLayout, Sidebar, Topbar
│   ├── shared/   # Reusable app components
│   └── ui/       # shadcn/ui primitives
├── hooks/        # React Query wrappers
├── lib/          # Axios client, permissions, constants, utils
├── pages/        # One file per route
└── store/        # Zustand auth store
```

## Backend CORS

Add this to `server/api/main.py` before the routes:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
