# GrandStay SaaS — Core API Documentation

## Authentication & Session
- `POST /api/auth/login`: Authenticates user, checks hotel active status, returns signed JWT and sets auth cookie.
- `POST /api/auth/change-password`: Updates password, enforces first-time setup or credential rotation, sets `mustChangePassword: false`, records audit log.
- `POST /api/auth/register`: Public registration endpoint.

## System Health & Diagnostics
- `GET /api/health`: Health probe returning `{ status: "ok", uptimeSeconds, database, latencyMs }`.

## Receptionist Dashboard & Front Desk Operations
- `GET /api/receptionist/dashboard`: Master front-desk aggregation returning live room inventory, today's arrivals/departures, pending payments, recent bookings, and operational alerts strictly scoped to `authUser.hotelId`.
- `GET /api/stays`: Active stays (`status: CHECKED_IN`) query with search by booking ID, room number, or guest details.

## Customers & Guest Profiles (Receptionist / Manager)
- `GET /api/customers`: List hotel customers with search (name, phone, email, customerId), pagination, and sorting.
- `POST /api/customers`: Register new customer with duplicate phone detection and auto-generated `CUS-000001` sequential ID.
- `GET /api/customers/[id]`: Retrieve customer profile and historical stays within the hotel.
- `PATCH /api/customers/[id]`: Update customer profile attributes with phone uniqueness protection.
- `DELETE /api/customers/[id]`: Soft-deactivate customer profile.

## Room & Inventory Management (Manager / Receptionist)
- `GET /api/rooms`: List rooms belonging to authenticated user's hotel.
- `GET /api/rooms/available`: Query available rooms for specific check-in and check-out dates and capacity.
- `POST /api/rooms`: Create a new room (Manager only; enforces subscription `maxRooms` limit).
- `GET /api/rooms/[id]`: Get room details.
- `PATCH /api/rooms/[id]`: Update room details.
- `PATCH /api/rooms/[id]/status`: Update room operational status (`AVAILABLE`, `CLEANING`, `MAINTENANCE`, `OUT_OF_SERVICE`).

## Guest Bookings & Reservations (Receptionist / Manager)
- `GET /api/bookings`: Paginated booking queries scoped to hotelId with status, search, and date filters.
- `POST /api/bookings`: Create a new room reservation (performs server-side date validation, pricing snapshot, and double-booking conflict prevention).
- `GET /api/bookings/[id]`: Retrieve single booking details with room, customer, and creator linkage.
- `PATCH /api/bookings/[id]`: Modify reservation dates, room, or guests with re-validated availability and pricing.
- `POST /api/bookings/[id]/check-in`: Guest check-in transition (verifies arrival date, marks room as `OCCUPIED`, booking as `CHECKED_IN`).
- `POST /api/bookings/[id]/check-out`: Guest check-out transition (generates final invoice, marks room as `CLEANING`, dispatches housekeeping turnaround task, marks booking as `COMPLETED`).
- `POST /api/bookings/[id]/cancel`: Cancel booking and release room hold.

## Billing, Invoices & Payments (Receptionist / Manager)
- `GET /api/billing` / `GET /api/invoices`: Paginated invoice ledger with search, payment status filters, and customer folio links.
- `GET /api/invoices/[id]`: Detailed invoice view with itemized charges, taxes, discounts, and payment history.
- `POST /api/billing/[id]/generate`: Generate invoice for a booking with server-side rate calculation.
- `POST /api/billing/[id]/payment` / `POST /api/invoices/[id]/payment`: Record incremental or full payments with overpayment guards (`CASH`, `UPI`, `CARD`, `BANK_TRANSFER`).

## Housekeeping, Room Service & Maintenance
- `GET /api/housekeeping`: List housekeeping tasks with status and priority filtering.
- `POST /api/housekeeping`: Create manual or turnaround cleaning tasks.
- `POST /api/housekeeping/[id]/start`: Mark cleaning started by assigned staff.
- `POST /api/housekeeping/[id]/complete`: Mark room cleaning completed (safely transitions room status back to `AVAILABLE`).
- `GET /api/room-service`: List room service requests.
- `POST /api/room-service`: Create new room service request for an active room.
- `POST /api/room-service/[id]/complete`: Mark service order fulfilled.
- `GET /api/maintenance`: List maintenance requests.
- `POST /api/maintenance/[id]/resolve`: Mark maintenance incident resolved.

## Front Desk & Property Analytics (Receptionist / Manager)
- `GET /api/reports/overview`: Executive operational and financial overview.
- `GET /api/reports/bookings`: Historical booking ledgers and status distributions.
- `GET /api/reports/occupancy`: Real-time vs historical sellable occupancy rates.
- `GET /api/reports/revenue`: Daily revenue aggregations and gross/collected/due breakdowns.
- `GET /api/reports/payments`: Payment method breakdowns and outstanding dues.
- `GET /api/reports/customers`: Customer intelligence, repeat guest metrics, and lifetime spend.
- `GET /api/reports/housekeeping`: Housekeeping turnaround and task volumes.
- `GET /api/reports/room-service`: Order volume and popular item rankings.
- `GET /api/reports/rooms`: Room performance metrics and category utilization.
- `GET /api/reports/export`: Secure, tenant-isolated CSV export streaming with spreadsheet formula injection protection.

## System Admin & Platform Management
- `GET /api/admin/hotels`: List all tenant hotel properties with pagination.
- `POST /api/admin/hotels`: Register new hotel property.
- `GET /api/admin/hotels/[id]`: Retrieve hotel property metadata and current manager assignment.
- `PATCH /api/admin/hotels/[id]`: Update hotel details or toggle status (`ACTIVE` / `INACTIVE` / `SUSPENDED`).
- `GET /api/admin/audit-logs`: Platform-wide security audit trail.
- `GET /api/admin/subscriptions/plans`: Manage SaaS subscription plans and tiers.
