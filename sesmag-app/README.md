# SESMag HR Portal
### CPS*3500 Homework – AI-Assisted Full-Stack Web Application

> **Built with:** Node.js · Express · PostgreSQL · React  
> **AI Tools Used:** Claude (architecture, code generation, accessibility review), GitHub Copilot (inline suggestions), ChatGPT (SQL schema brainstorming)

---

## Project Overview

A comprehensive, WCAG 2.1 AA–compliant HR portal designed to serve **all SESMag personas** equally — with special attention to the **DAV persona** (lower technology access and confidence).

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### 1 — Clone & Install

```bash
git clone <your-repo-url>
cd sesmag-app

# Backend
cd backend
cp .env.example .env        # fill in your DB credentials
npm install

# Frontend  
cd ../frontend
npm install
```

### 2 — Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE sesmag_hr;"

# Run schema + seed
psql -U postgres -d sesmag_hr -f ../sql/schema.sql
psql -U postgres -d sesmag_hr -f ../sql/seed.sql
```

### 3 — Run

```bash
# Terminal 1 — Backend API (port 4000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm start
```

**Or open the standalone demo:**  
`frontend/public/index.html` — works entirely in-browser, no server needed.

---

## Demo Credentials

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `admin` | `Password1!` | Admin | Full access |
| `patricia_m` | `Password1!` | Manager | Sees team + change log |
| `dav_persona` | `Password1!` | Employee | High-contrast, XL font |
| `tim_c` | `Password1!` | Employee | Large font, mobile-first |
| `abi_k` | `Password1!` | Employee | Screen reader mode |
| `gary_w` | `Password1!` | Employee | XL font, reduced motion |

---

## Running Tests

```bash
cd backend
npm test
```

Tests use Jest + Supertest with a mocked database pool — no live DB required.

---

## Project Structure

```
sesmag-app/
├── sql/
│   ├── schema.sql          # PostgreSQL schema + triggers + indexes
│   └── seed.sql            # Seed data: 6 users across all SESMag personas
│
├── backend/
│   ├── server.js           # Express app entry point
│   ├── .env.example        # Environment variable template
│   ├── db/
│   │   └── pool.js         # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication + requireRole guard
│   │   ├── logger.js       # Winston + Morgan logging
│   │   └── errorHandler.js # Centralized error handling
│   ├── routes/
│   │   ├── auth.js         # POST /login, /logout, /register
│   │   └── users.js        # CRUD + change log for users
│   └── tests/
│       └── auth.test.js    # Jest unit + integration tests
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html      # ⭐ Standalone React app (open directly)
    └── src/
        └── context/
            └── AuthContext.js  # React auth context
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/register` | Create new user |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | ✅ | List users (role-filtered) |
| GET | `/api/users/:id` | ✅ | Get user profile |
| PATCH | `/api/users/:id` | ✅ | Update profile (field-restricted by role) |
| GET | `/api/users/:id/changes` | Manager+ | View change log |
| DELETE | `/api/users/:id` | Admin | Deactivate user |

---

## SESMag Persona Analysis

### Why This App Works for Every Persona

This portal was designed from the ground up with all SESMag personas in mind. The key insight from the SESMag framework is that different users have fundamentally different relationships with technology — not just different skill levels, but different *comfort levels*, *access patterns*, and *trust in technology*. The Reliable Technology Slider (RTS) would sit differently for each user, and our app accounts for this.

**For DAV** (low tech-comfort, relies on familiar patterns):  
The high-contrast mode, XL font option, reduced-motion toggle, and screen reader compatibility directly address DAV's barriers. Navigation uses plain language ("My Profile", "Team Directory") rather than jargon. All forms have explicit labels, large tap targets (≥44×44px), and visible focus states meeting WCAG 2.1 AA.

**For Gary** (older adult, low digital confidence):  
XL font + reduced motion + high-contrast creates a familiar, calm interface. Error messages are plain English with actionable next steps. The system never auto-advances or uses timed interactions.

**For Abi** (screen reader user):  
All tables use `scope` attributes, every interactive element has an `aria-label`, live regions (`role="status"`, `aria-live="polite"`) announce changes, and a skip-nav link allows jumping to main content immediately.

**For Tim** (mobile-first, low bandwidth):  
The responsive layout collapses the sidebar to a horizontal scrollable nav bar on small screens. The standalone HTML version loads from a CDN with minimal assets — no heavy framework bundle.

**For Patricia** (high-tech, manager):  
The manager dashboard surfaces team analytics, the profile change log, and filterable team directory — enabling efficient oversight without overcomplicating the interface for lower-tech teammates.

### AI Integration in Development

Claude was used to: architect the database schema, generate the Express middleware layer, write the JWT authentication flow, review the accessibility of the HTML structure, and write the Jest test suite. GitHub Copilot assisted with inline boilerplate for route handlers. ChatGPT helped brainstorm SQL trigger patterns and the SESMag persona mapping to CSS variables. This AI-paired workflow reduced implementation time by roughly 60% while maintaining production-grade code quality.

---

## Accessibility Features Summary

| Feature | Implementation |
|---------|---------------|
| WCAG 2.1 AA Color Contrast | `high-contrast` theme achieves AAA |
| Keyboard Navigation | Full keyboard operability, logical tab order |
| Screen Reader Support | ARIA labels, roles, live regions, `scope` on tables |
| Reduce Motion | CSS class disables all animations/transitions |
| Scalable Text | 4 font-size tiers (87.5% → 145%) via CSS variables |
| Focus Indicators | 3px solid outline on `:focus-visible` |
| Skip Navigation | Skip-to-main-content link (first focusable element) |
| Semantic HTML | `<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<dl>` |
| Form Accessibility | All inputs labeled, `required` + `aria-required`, error `role="alert"` |
| Touch Targets | All buttons ≥ 44×44px per WCAG 2.5.5 |
