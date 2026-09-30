# GrandStay SaaS — Multi-Tenant Architecture & System Design

## 1. System Overview
**GrandStay** is an enterprise-grade multi-tenant Hotel Management Software-as-a-Service (SaaS) built on Next.js 16 (App Router), TypeScript, and MongoDB. It manages the complete lifecycle of hotel operations from property configuration and guest bookings to front-desk check-ins, room housekeeping, room service orders, billing, and analytical reports.

---

## 2. Core User Roles & RBAC Model

| Role | Scope | Key Capabilities |
| :--- | :--- | :--- |
| **SYSTEM_ADMIN** | Platform-Wide | Manage hotels, assign managers, configure SaaS subscription plans, inspect platform audit logs. |
| **MANAGER** | Hotel Property (`hotelId`) | Manage room inventory, staff accounts, receptionists, view financial & operational reports, audit logs. |
| **RECEPTIONIST** | Hotel Property (`hotelId`) | Guest management, reservations, check-in, check-out, billing, room service requests, booking history. |
| **STAFF** | Hotel Property (`hotelId`) | Housekeeping cleaning tasks, room service order fulfillment, maintenance incident resolution. |

---

## 3. Multi-Tenant Isolation Strategy

```
[ Incoming Request ]
        ↓
[ JWT Authentication Token ]
        ↓
[ Extract Authenticated User (`userId`, `role`, `hotelId`) ]
        ↓
[ Enforce Tenant Filter: `{ hotelId: authenticatedUser.hotelId }` ]
        ↓
[ Database Query / Execution ]
```

### Critical Rules:
1. **Never Trust Client-Provided `hotelId`**: The `hotelId` is extracted solely from the cryptographically signed JWT payload in `requireRole` / `requireAuth`.
2. **Compound Database Indexes**: All models (`Room`, `Booking`, `Invoice`, `HousekeepingTask`, `RoomServiceRequest`, `MaintenanceRequest`, `Customer`) include compound indexes prefixed by `hotelId: 1`.
3. **Cross-Tenant IDOR Prevention**: Queries lookup records strictly by `{ _id: recordId, hotelId: authenticatedUser.hotelId }`. If a user attempts to access a record belonging to another hotel, a `404 Not Found` or `403 Forbidden` is returned without leaking information.

---

## 4. Operational & Transactional Workflows

### Guest Journey Workflow
```
CUSTOMER REGISTRATION
        ↓
BOOKING CREATED (Status: CONFIRMED)
        ↓
GUEST ARRIVAL & CHECK-IN (Room Status: OCCUPIED, Booking Status: CHECKED_IN)
        ↓
STAY & SERVICES (Room Service, Additional Amenities)
        ↓
GUEST DEPARTURE & CHECK-OUT (Booking Status: COMPLETED, Final Invoice Generated)
        ↓
ROOM CLEANING (Room Status: CLEANING, Housekeeping Task Created)
        ↓
STAFF CLEANING COMPLETED (Room Status: AVAILABLE)
```

### Financial Source of Truth
- Revenue and payments derive strictly from immutable [`Invoice`](file:///c:/Users/abhig/Desktop/hotel/src/models/Invoice.ts) records (`totalAmount`, `amountPaid`, `amountDue`).
- Historical pricing is frozen inside booking and invoice records and never recalculated using dynamic room prices.

---

## 5. Subscription Lifecycle & Plan Enforcement

1. **Plan Tiers**:
   - Free Trial / Starter / Professional / Enterprise.
   - Enforces: `maxRooms`, `maxStaff`, `maxReceptionists`.
2. **Lifecycle States**:
   - `ACTIVE`: Normal operations.
   - `EXPIRED`: Restricts modifications and additions.
   - `SUSPENDED`: Restricts operational access.
   - `CANCELLED`: Deactivated access with data retention.
