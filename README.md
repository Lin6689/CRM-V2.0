# MiniCRM — Billing & Invoicing App

A full-stack billing/CRM web app (Vyapar-style) with client management, staff accounts, invoicing, payments ledger (Khata), analytics dashboard, and role-based access control.

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS, Recharts
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcryptjs
- **Uploads:** Multer + Cloudinary (local fallback)
- **Email:** Nodemailer (Gmail SMTP) + PDFKit invoice PDFs
- **Security:** Helmet, rate limiting, CORS, RBAC

## Roles (3-tier model)

| Role | Who | Access |
|---|---|---|
| `superadmin` | Platform owner (you) | Clients page — sees all client businesses, no billing data |
| `admin` | Client / business owner | Full access to own business: dashboard, customers, products, invoices, team, analytics |
| `staff` | Client's employee | Limited: view products, add customers, create invoices, record payments — no delete/edit/cancel |

- **No public registration** — login only. Accounts are created via `backend/seed.js`.
- Staff inherits the client's `businessName` and `address` automatically (cannot edit).
- Each business's data is isolated by `businessId`.

## Features

- Login with JWT auth (bcrypt hashed passwords)
- Super admin Clients dashboard: all clients, staff counts, join dates
- Client admin: customers/products/invoices CRUD, team management, analytics
- Staff: billing operations only (enforced on backend + frontend)
- Invoice generation: auto tax, stock deduction, partial payments, due dates, overdue
- Invoice cancellation with stock restore (MongoDB transactions)
- Khata/ledger: payment history per customer
- Analytics dashboard: revenue KPIs, 6-month trend, top products, low-stock alerts
- Search, filters, sorting, pagination, CSV export
- Email invoice PDFs via Gmail SMTP
- Product images on Cloudinary (local fallback)

## Project Structure

```
├── backend/
│   ├── app.js               # Express app, middleware, static uploads
│   ├── bin/www              # Server entry point
│   ├── seed.js              # Account seeder (superadmin + clients)
│   ├── models/              # User, Customer, Product, Invoice, Payment
│   ├── routes/              # auth, customers, products, invoices, payments, analytics, users
│   └── middleware/auth.js   # JWT verify + authorizeRoles
└── frontend/
    └── src/
        ├── api.js           # API client (VITE_API_URL env)
        ├── context/         # AuthContext
        └── components/      # Auth(login), Layout, Clients, Dashboard, Customers, Products, Invoices, Team
```

## Setup

### Backend

```bash
cd backend
npm install
npm run seed     # creates superadmin + sample clients (edit CLIENTS array first)
npm start        # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## Creating Accounts

Edit `backend/seed.js`:

- `SUPER_ADMIN` — your platform admin credentials
- `CLIENTS` array — each client: `name`, `email`, `password`, `businessName`, `address`

Then run `npm run seed`. Existing emails are skipped; re-running is safe.

Staff accounts are created by each client admin from the **Team** page.

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image uploads |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Invoice email sending |
| `FRONTEND_URL` | Allowed CORS origin (production) |

Frontend: `VITE_API_URL` — backend base URL.


## API Overview

| Endpoint | Access | Description |
|---|---|---|
| `POST /api/auth/login` | Public | Login → JWT |
| `GET /api/users` | superadmin: all / admin: own business | User listing |
| `POST /api/users` | admin | Create staff |
| `GET/POST /api/customers` | admin, staff | Customer CRUD + ledger |
| `GET/POST /api/products` | admin write / staff read | Product CRUD + images |
| `GET/POST /api/invoices` | admin, staff | Invoice create/list/cancel/PDF/email |
| `POST /api/invoices/:id/payments` | admin, staff | Record payment |
| `GET /api/analytics/summary` | admin | Dashboard data |
| `GET /api/*/export` | admin, staff | CSV export |

## Key Concepts

- **Auth:** JWT issued on login → `Authorization: Bearer` header → `authMiddleware` verifies → `authorizeRoles()` enforces RBAC.
- **Data isolation:** every record stores `businessId`; queries filter by `req.bizId`.
- **Invoice math:** server-side — DB prices, line totals → subtotal → tax → grandTotal; stock via `$inc`; payments in MongoDB transactions.
- **Analytics:** MongoDB aggregation pipelines (`$match` → `$group` → `$sort`).
