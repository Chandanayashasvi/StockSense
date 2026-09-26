# Architecture

This project uses React on the client, a REST API in Express, Prisma for persistence, and PostgreSQL for storage.

## Request flow

React frontend -> Express API -> Prisma -> PostgreSQL

## Real-time updates

Socket.IO emits inventory and dashboard updates after stock-changing transactions complete.
