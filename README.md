# FinFlow - Premium Full-Stack Budget Planner

**FinFlow** is a modern, responsive full-stack financial budget planner. Built with a React frontend and Express backend, it features interactive data analytics, proactive budget forecasting, multi-user isolation, and a dual-mode API client that runs offline using browser localStorage when deployed statically.

---

## Key Features

### 1. Modern Glassmorphic UI & Top Navigation
- Sleek top navigation bar with tab routing (Dashboard, Ledger, Budgets, Savings, Future Simulator).
- Interactive user avatar dropdown menu for profile adjustments, password changes, and account resets.

### 2. Multi-User Verification & Security
- Relational schema isolating all ledger transactions, budget limits, savings goals, and future plans by `userId`.
- SHA-256 secure password hashing on the backend.
- Account verification system via email OTP (One-Time Password) powered by Nodemailer.
- Automatic connection fallback to local mock emails if offline.

### 3. Analytics & optimal Allocation Wizard
- Dynamic SVG charts: Doughnut chart for category spent distributions, Bar chart for income vs. expense trends.
- Setup wizard configuring expected income, baseline balance, and spending caps.
- Target optimal allocations analyzer offering recommendations using 50-30-20 rule budgets.

### 4. Interactive Future Purchase Simulator
- Add future purchases (e.g. buying a car, laptop) with targeted timeframes.
- Computes parallel required monthly savings rate and detects cash-flow deficits.
- Features a **one-click budget cut optimizer** to proportionally shrink budget caps and accommodate new goals.
- Renders a sequential milestone timeline showing exactly when each purchase will be reached.

---

## Tech Stack

- **Frontend**: React (Vite), JavaScript, Vanilla CSS (Variables, HSL Palettes, Transitions)
- **Backend**: Node.js, Express, Nodemailer
- **Database**: Flat JSON Database (`backend/data/db.json`)
- **Hosting**: GitHub Pages via GitHub Actions

---

## Local Setup Instructions

### 1. Install Dependencies
```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

### 3. Run the App
```bash
# Start Express Server (runs on port 5000)
cd backend
npm start

# Start Vite Development Server (runs on port 5173)
cd ../frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.
