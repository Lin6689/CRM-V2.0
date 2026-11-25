# MiniCRM — Billing & Invoicing App

A full-stack billing/CRM web app (Vyapar-style) with customer management, invoicing, payments ledger (Khata), analytics dashboard, RBAC, and team management.

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS, Recharts
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcryptjs
- **Uploads:** Multer + Cloudinary (local fallback)
- **Email:** Nodemailer (Gmail SMTP) + PDFKit invoice PDFs
- **Security:** Helmet, rate limiting, CORS, role-based access control

## Features

- User registration/login (JWT auth, bcrypt hashing)
- Role-based access: **Admin** (full access) vs **Staff** (billing only)
- Multi-business data isolation (`businessId` scoping)
- Customer CRUD + ledger (Khata) with payment history
- Product CRUD with image upload (Cloudinary) + stock management
- Invoice generation with auto tax calculation, stock deduction
- Partial/full payments, due dates, overdue detection
- Invoice cancellation with stock restore (MongoDB transactions)
- Analytics dashboard: revenue KPIs, 6-month sales trend, top products, low-stock alerts
- Search, filters, sorting, pagination on all lists
- CSV export (invoices/customers)
- Email invoice PDFs to customers via Gmail SMTP
- Team management: admin creates/disables staff accounts

## Project Structure

```
├── backend/
│   ├── app.js               # Express app, middleware, static uploads
│   ├── bin/www              # Server entry point
│   ├── models/              # User, Customer, Product, Invoice, Payment (Mongoose)
│   ├── routes/              # auth, customers, products, invoices, payments, analytics, users
│   └── middleware/auth.js   # JWT verify + authorizeRoles
└── frontend/
    └── src/
        ├── api.js           # API client (fetch wrapper, JWT header, downloads)
        ├── context/         # AuthContext (React Context for auth state)
        └── components/      # Auth, Layout, Dashboard, Customers, Products, Invoices, Team
```

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in values
npm start              # runs on http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (optional — local fallback) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GMAIL_USER` | Gmail address for sending invoice emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16-char) |
| `FRONTEND_URL` | Allowed CORS origin (production) |

Frontend env: `VITE_API_URL` — backend base URL (defaults to `http://localhost:3000`).

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | test@example.com | 123456 |
| Staff | user2@gmail.com | Pass@123 |

## API Overview

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register new business (becomes admin) |
| `POST /api/auth/login` | Login → JWT token |
| `GET/POST /api/customers` | Customer CRUD + ledger |
| `GET/POST /api/products` | Product CRUD + image upload |
| `GET/POST /api/invoices` | Invoice create/list, cancel, PDF, email |
| `POST /api/invoices/:id/payments` | Record payment (transaction-safe) |
| `GET /api/analytics/summary` | Dashboard KPIs + chart data |
| `GET/POST /api/users` | Team management (admin only) |
| `GET /api/*/export` | CSV export |

## How It Works (key concepts)

- **Auth:** login issues a signed JWT → stored in `localStorage` → sent as `Authorization: Bearer` header → verified by `authMiddleware` on every protected route.
- **RBAC:** `role` field in JWT payload; `authorizeRoles('admin')` middleware returns 403 for staff on restricted routes.
- **Data isolation:** every record stores `businessId`; all queries filter by `req.bizId` so each business sees only its own data.
- **Invoice math:** computed server-side — line totals → subtotal → tax% → grandTotal; stock deducted via `$inc`; payments wrapped in a MongoDB transaction so invoice + customer balance stay consistent.
- **Analytics:** MongoDB aggregation pipelines (`$match` → `$group` → `$sort`) compute revenue, monthly trends, top products server-side.
