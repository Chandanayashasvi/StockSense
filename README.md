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

## Notes

The frontend remains visually unchanged; only the runtime config was switched from mock mode to the live backend.
