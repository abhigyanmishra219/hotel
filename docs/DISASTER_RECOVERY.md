# GrandStay SaaS — Disaster Recovery & Backup Runbook

## 1. Database Backup Strategy

### Automated MongoDB Atlas Snapshots
- **Continuous Backups / Point-in-Time Recovery (PITR)**: Retention window of 7 to 35 days.
- **Daily Snapshots**: Automated daily backup snapshot retained for 30 days.
- **Weekly & Monthly Archives**: Retained for 1 year for compliance and audit requirements.

---

## 2. Manual Backup & Restore Procedures

### Export Database Snapshot
```bash
mongodump --uri="mongodb+srv://<USER>:<PASS>@<CLUSTER>.mongodb.net/grandstay_db" --out=/backups/backup_$(date +%Y%m%d_%H%M%S)
```

### Restore Database Snapshot
```bash
mongorestore --uri="mongodb+srv://<USER>:<PASS>@<CLUSTER>.mongodb.net/grandstay_db" --drop /backups/backup_<TIMESTAMP>/grandstay_db
```

---

## 3. Secret Rotation Procedures

### JWT Secret Rotation
1. Update `JWT_SECRET` in environment variables with a new 32+ character random key.
2. Deploy the application update.
3. Active user sessions will expire gracefully and prompt users to re-authenticate.

### Database Credentials Rotation
1. Create a secondary database user in MongoDB Atlas with `readWrite` permissions.
2. Update `MONGODB_URI` environment variable with the new credentials.
3. Restart application workers / pods.
4. Delete the deprecated database user in MongoDB Atlas.

---

## 4. Incident Response Playbook
- **Database Connectivity Failure**: Next.js health endpoint `GET /api/health` returns status `503 Service Unavailable`. Check Atlas network access whitelist and connection quotas.
- **Tenant Isolation Breach Alert**: Review `AuditLog` records for unauthorized cross-tenant attempts. Verify that tenant filters `{ hotelId: user.hotelId }` remain strictly bound to authenticated JWT credentials.
