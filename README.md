# StockSense

StockSense is a warehouse inventory management application with a React frontend and a Node.js + PostgreSQL backend.

## Project structure

- frontend: existing React app in `stocksense/`
- backend: Express + Prisma + PostgreSQL API in `backend/`
- docs: architecture and operational docs in `docs/`

## Local setup

1. Copy the backend env file:
   `cp backend/.env.example backend/.env`
2. Update `backend/.env` as needed.
3. Start PostgreSQL:
   `docker compose up -d`
4. Run migrations:
   `npm run db:migrate`
5. Seed demo data:
   `npm run seed`
6. Start the API:
   `npm run dev`
7. Start the frontend from `stocksense`:
   `cd stocksense && npm run dev -- --host 0.0.0.0`

## Demo credentials

- manager@stocksense.local / Password123!
- staff@stocksense.local / Password123!

## API docs

- http://localhost:8000/api-docs

## SMTP and Email

Copy `backend/.env.example` to `backend/.env` and set the SMTP values there. Keep that file local and never commit it.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-address@gmail.com
SMTP_PASSWORD=your-provider-app-password
SMTP_FROM="StockSense <your-address@gmail.com>"
```

For Gmail, enable two-step verification and create an App Password; do not use your account password. For another provider, use its authenticated SMTP hostname, port, TLS mode, username, and an approved sender address. Port 587 normally uses `SMTP_SECURE=false` with STARTTLS; implicit TLS on port 465 normally uses `SMTP_SECURE=true`.

Restart the backend after changing `backend/.env`:

```powershell
cd backend
npm.cmd run dev
```

To test delivery, sign up with an address you can access. A successful signup response means the configured SMTP server accepted the verification message; a `503` response means delivery was not confirmed. Complete a receipt, delivery, transfer, or adjustment to test operation notifications. Low-stock alerts are sent when stock crosses down to its reorder threshold, and notification preferences are honored.

Email verification and operational notifications require configured SMTP. Existing accounts are preserved as verified by the migration; new accounts remain unverified until the link is used. The current password-reset OTP flow is pre-existing and was not changed by this work.
