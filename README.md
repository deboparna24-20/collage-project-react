# Estorvix

Estorvix is a React (JSX) and Vite frontend served by the Express API, with MySQL access through `mysql2`.

## Run locally

Prerequisites: Node.js and a running MySQL server with the `estorvix_db` database.

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Set the MySQL connection values in `.env` (see `.env.example`). Import `database.sql` if the database has not been initialized.
3. Start the combined Express, API, and Vite development server:
   ```powershell
   npm run dev
   ```
4. Open http://localhost:3000. The public site is at `/`; the Admin Panel is at `/admin`.

Express serves the API and Vite middleware from one process. Vite's HMR WebSocket shares the Express HTTP server, so no separate Vite command or WebSocket port is needed.

If port 3000 is occupied, stop the other Estorvix server or run on another port in PowerShell:
```powershell
$env:PORT=3001
npm run dev
```

For a production build, run `npm run build`, then set `NODE_ENV=production` and start the server with `npm start`.

The admin API uses the existing MySQL `properties` and `inquiries` tables. Property image uploads are limited to JPEG, PNG, or WebP (5 MB maximum) and stored under the ignored `uploads/` directory.
