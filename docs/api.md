# API

The backend exposes REST endpoints under `/api` with Swagger at `/api-docs`.

Key endpoints:
- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/request-otp`
- `/api/auth/reset-password`
- `/api/products`
- `/api/documents`
- `/api/move-history`
- `/api/dashboard/stats`
- `/api/import/inventory/validate` (multipart `file`, CSV/XLSX preview)
- `/api/import/inventory` (multipart `file`, transactional commit)
- `/api/notifications/preferences` (GET/PUT for the authenticated user)
