# GrandStay SaaS — Production Deployment & Operations Guide

## 1. Prerequisites
- Node.js >= 20.x LTS
- MongoDB Atlas Cluster (v6.0+ or v7.0+)
- Domain Name with SSL/TLS certificate (HTTPS enforced)

---

## 2. Environment Variables Checklist

Ensure the following variables are configured in your hosting environment (e.g. Vercel, AWS ECS, Railway, Docker):

| Variable | Description | Production Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`production`) | Set to `production` |
| `MONGODB_URI` | MongoDB Atlas Connection String | Secure Atlas URI with SSL (`+srv`) |
| `JWT_SECRET` | Secret key for signing session tokens | Minimum 32 characters, cryptographically random |
| `JWT_EXPIRES_IN` | Token duration (e.g., `7d` or `24h`) | Default: `7d` |
| `NEXT_PUBLIC_APP_URL` | Canonical SaaS domain URL | e.g., `https://app.grandstay.com` |

---

## 3. Build & Deployment Commands

### Standard Node.js / Docker
```bash
# Install dependencies
npm ci

# Typecheck & Build Next.js Production Bundle
npm run build

# Start Production Server
npm start
```

---

## 4. Production Security & Hardening Checklist
- [x] **Rate Limiting**: Active on `/api/auth/login`, `/api/auth/register`, `/api/auth/change-password`.
- [x] **Security Headers**: `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`.
- [x] **Cache Control**: Sensitive API responses served with `no-store, no-cache, must-revalidate`.
- [x] **Audit Trail**: Administrative actions logged immutably with passwords redacted.
- [x] **Health Check**: Available at `GET /api/health` for load-balancer probes and uptime monitors.
