import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange, formatCsv } from "@/lib/reportService";

/**
 * GET /api/reports/export?type=bookings|revenue|payments|occupancy|rooms|housekeeping|room-service|customers
 * Secure, tenant-isolated CSV export endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireRole(
      [USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMIN, USER_ROLES.RECEPTIONIST],
      req
    );

    if (!authUser.hotelId) {
      return NextResponse.json({ error: "User is not assigned to a hotel property" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") || "bookings";

    await connectToDatabase();
    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);

    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );
    const { startDate, endDate } = dateRange;

    let csvData = "";
    const dateStamp = new Date().toISOString().split("T")[0];
    let fileName = `report_${exportType}_${dateStamp}.csv`;

    switch (exportType) {
      case "bookings": {
        const bookings = await Booking.find({
          hotelId,
          createdAt: { $gte: startDate, $lt: endDate },
        })
          .sort({ createdAt: -1 })
          .populate("customerId", "fullName phone email")
          .populate("roomId", "roomNumber roomType")
          .lean();

        const bookingIds = bookings.map((b) => b._id);
        const invoices = await Invoice.find({ hotelId, bookingId: { $in: bookingIds } })
          .select("bookingId totalAmount amountPaid amountDue paymentStatus")
          .lean();
        const invoiceMap = new Map(invoices.map((inv) => [String(inv.bookingId), inv]));

        const headers = [
          { key: "bookingId", label: "Booking ID" },
          { key: "customerName", label: "Customer Name" },
          { key: "phone", label: "Phone" },
          { key: "roomNumber", label: "Room Number" },
          { key: "roomType", label: "Room Type" },
          { key: "checkInDate", label: "Check-In Date" },
          { key: "checkOutDate", label: "Check-Out Date" },
          { key: "actualCheckIn", label: "Actual Check-In" },
          { key: "actualCheckOut", label: "Actual Check-Out" },
          { key: "guests", label: "Guests" },
          { key: "totalAmount", label: "Total Amount (₹)" },
          { key: "amountPaid", label: "Amount Paid (₹)" },
          { key: "amountDue", label: "Amount Due (₹)" },
          { key: "paymentStatus", label: "Payment Status" },
          { key: "bookingStatus", label: "Booking Status" },
          { key: "createdAt", label: "Created At" },
        ];

        const rows = bookings.map((b: any) => {
          const inv = invoiceMap.get(String(b._id));
          return {
            bookingId: b.bookingId,
            customerName: b.customerId?.fullName || "—",
            phone: b.customerId?.phone || "—",
            roomNumber: b.roomId?.roomNumber || "—",
            roomType: b.roomId?.roomType || "—",
            checkInDate: new Date(b.checkInDate).toLocaleDateString(),
            checkOutDate: new Date(b.checkOutDate).toLocaleDateString(),
            actualCheckIn: b.actualCheckInAt
              ? new Date(b.actualCheckInAt).toLocaleString()
              : b.actualCheckInDate
              ? new Date(b.actualCheckInDate).toLocaleString()
              : b.actualCheckIn
              ? new Date(b.actualCheckIn).toLocaleString()
              : "—",
            actualCheckOut: b.actualCheckOutAt
              ? new Date(b.actualCheckOutAt).toLocaleString()
              : b.actualCheckOutDate
              ? new Date(b.actualCheckOutDate).toLocaleString()
              : b.actualCheckOut
              ? new Date(b.actualCheckOut).toLocaleString()
              : "—",
            guests: b.numberOfGuests || 1,
            totalAmount: inv ? inv.totalAmount : b.totalPrice || 0,
            amountPaid: inv ? inv.amountPaid : 0,
            amountDue: inv ? inv.amountDue : b.totalPrice || 0,
            paymentStatus: inv ? inv.paymentStatus : b.paymentStatus,
            bookingStatus: b.status,
            createdAt: new Date(b.createdAt).toLocaleString(),
          };
        });

        csvData = formatCsv(headers, rows);
        break;
      }

      case "revenue": {
        const invoices = await Invoice.aggregate([
          { $match: { hotelId, createdAt: { $gte: startDate, $lt: endDate } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              grossRevenue: { $sum: "$totalAmount" },
              collectedRevenue: { $sum: "$amountPaid" },
              outstandingDue: { $sum: "$amountDue" },
              invoicesCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        const headers = [
          { key: "date", label: "Date" },
          { key: "invoicesCount", label: "Invoices Count" },
          { key: "grossRevenue", label: "Gross Revenue (₹)" },
          { key: "collectedRevenue", label: "Collected Revenue (₹)" },
          { key: "outstandingDue", label: "Outstanding Due (₹)" },
        ];

        const rows = invoices.map((inv) => ({
          date: inv._id,
          invoicesCount: inv.invoicesCount,
          grossRevenue: inv.grossRevenue,
          collectedRevenue: inv.collectedRevenue,
          outstandingDue: inv.outstandingDue,
        }));

        csvData = formatCsv(headers, rows);
        break;
      }

      case "payments": {
        const invoices = await Invoice.find({
          hotelId,
          createdAt: { $gte: startDate, $lt: endDate },
        })
          .sort({ createdAt: -1 })
          .populate("customerId", "fullName phone")
          .populate("roomId", "roomNumber")
          .lean();

        const headers = [
          { key: "invoiceNumber", label: "Invoice Number" },
          { key: "customerName", label: "Customer" },
          { key: "phone", label: "Phone" },
          { key: "roomNumber", label: "Room" },
          { key: "totalAmount", label: "Total Amount (₹)" },
          { key: "amountPaid", label: "Amount Paid (₹)" },
          { key: "amountDue", label: "Amount Due (₹)" },
          { key: "paymentStatus", label: "Payment Status" },
          { key: "paymentMethod", label: "Payment Method" },
          { key: "createdAt", label: "Issued Date" },
        ];

        const rows = invoices.map((inv: any) => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerId?.fullName || "—",
          phone: inv.customerId?.phone || "—",
          roomNumber: inv.roomId?.roomNumber || "—",
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid,
          amountDue: inv.amountDue,
          paymentStatus: inv.paymentStatus,
          paymentMethod: inv.paymentMethod || "CASH",
          createdAt: new Date(inv.createdAt).toLocaleString(),
        }));

        csvData = formatCsv(headers, rows);
        break;
      }

      case "rooms": {
        const rooms = await Room.find({ hotelId, isActive: true }).sort({ roomNumber: 1 }).lean();
        const roomIds = rooms.map((r) => r._id);

        const [bookingStats, invoiceStats] = await Promise.all([
          Booking.aggregate([
            { $match: { hotelId, roomId: { $in: roomIds }, createdAt: { $gte: startDate, $lt: endDate } } },
            {
              $group: {
                _id: "$roomId",
                totalBookings: { $sum: 1 },
                completedStays: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
                occupiedNights: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["CONFIRMED", "CHECKED_IN", "COMPLETED"]] },
                      {
                        $max: [
                          1,
                          {
                            $round: {
                              $divide: [{ $subtract: ["$checkOutDate", "$checkInDate"] }, 86400000],
                            },
                          },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            },
          ]),
          Invoice.aggregate([
            { $match: { hotelId, roomId: { $in: roomIds }, createdAt: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: "$roomId", revenue: { $sum: "$totalAmount" } } },
          ]),
        ]);

        const bMap = new Map(bookingStats.map((b) => [String(b._id), b]));
        const iMap = new Map(invoiceStats.map((i) => [String(i._id), i]));

        const headers = [
          { key: "roomNumber", label: "Room Number" },
          { key: "roomType", label: "Room Type" },
          { key: "floor", label: "Floor" },
          { key: "status", label: "Current Status" },
          { key: "pricePerNight", label: "Base Price/Night (₹)" },
          { key: "totalBookings", label: "Total Bookings" },
          { key: "completedStays", label: "Completed Stays" },
          { key: "occupiedNights", label: "Occupied Nights" },
          { key: "revenue", label: "Generated Revenue (₹)" },
        ];

        const rows = rooms.map((r) => {
          const b = bMap.get(String(r._id));
          const i = iMap.get(String(r._id));
          return {
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            floor: r.floor,
            status: r.status,
            pricePerNight: r.pricePerNight,
            totalBookings: b?.totalBookings || 0,
            completedStays: b?.completedStays || 0,
            occupiedNights: b?.occupiedNights || 0,
            revenue: i?.revenue || 0,
          };
        });

        csvData = formatCsv(headers, rows);
        break;
      }

      case "housekeeping": {
        const tasks = await HousekeepingTask.find({
          hotelId,
          createdAt: { $gte: startDate, $lt: endDate },
        })
          .sort({ createdAt: -1 })
          .populate("roomId", "roomNumber roomType")
          .populate("assignedTo", "name")
          .lean();

        const headers = [
          { key: "taskId", label: "Task ID" },
          { key: "roomNumber", label: "Room" },
          { key: "roomType", label: "Room Type" },
          { key: "assignedStaff", label: "Assigned Staff" },
          { key: "type", label: "Task Type" },
          { key: "priority", label: "Priority" },
          { key: "status", label: "Status" },
          { key: "startedAt", label: "Started At" },
          { key: "completedAt", label: "Completed At" },
          { key: "createdAt", label: "Created Date" },
        ];

        const rows = tasks.map((t: any) => ({
          taskId: t.taskId,
          roomNumber: t.roomId?.roomNumber || "—",
          roomType: t.roomId?.roomType || "—",
          assignedStaff: t.assignedTo?.name || "Unassigned",
          type: t.type,
          priority: t.priority,
          status: t.status,
          startedAt: t.startedAt ? new Date(t.startedAt).toLocaleString() : "—",
          completedAt: t.completedAt ? new Date(t.completedAt).toLocaleString() : "—",
          createdAt: new Date(t.createdAt).toLocaleString(),
        }));

        csvData = formatCsv(headers, rows);
        break;
      }

      case "room-service": {
        const requests = await RoomServiceRequest.find({
          hotelId,
          createdAt: { $gte: startDate, $lt: endDate },
        })
          .sort({ createdAt: -1 })
          .populate("roomId", "roomNumber")
          .populate("assignedTo", "name")
          .lean();

        const headers = [
          { key: "requestId", label: "Request ID" },
          { key: "roomNumber", label: "Room" },
          { key: "assignedStaff", label: "Assigned Staff" },
          { key: "items", label: "Items" },
          { key: "priority", label: "Priority" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Request Time" },
        ];

        const rows = requests.map((r: any) => ({
          requestId: r.requestId,
          roomNumber: r.roomId?.roomNumber || "—",
          assignedStaff: r.assignedTo?.name || "Unassigned",
          items: (r.items || []).map((i: any) => `${i.item} (x${i.quantity})`).join("; "),
          priority: r.priority,
          status: r.status,
          createdAt: new Date(r.createdAt).toLocaleString(),
        }));

        csvData = formatCsv(headers, rows);
        break;
      }

      case "customers": {
        const customers = await Customer.find({ hotelId, isActive: true })
          .sort({ createdAt: -1 })
          .lean();

        const customerIds = customers.map((c) => c._id);
        const [bookingStats, invoiceStats] = await Promise.all([
          Booking.aggregate([
            { $match: { hotelId, customerId: { $in: customerIds } } },
            {
              $group: {
                _id: "$customerId",
                totalBookings: { $sum: 1 },
                completedStays: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
              },
            },
          ]),
          Invoice.aggregate([
            { $match: { hotelId, customerId: { $in: customerIds } } },
            { $group: { _id: "$customerId", totalSpent: { $sum: "$totalAmount" } } },
          ]),
        ]);

        const bMap = new Map(bookingStats.map((b) => [String(b._id), b]));
        const iMap = new Map(invoiceStats.map((i) => [String(i._id), i]));

        const headers = [
          { key: "customerId", label: "Customer ID" },
          { key: "fullName", label: "Full Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "location", label: "City/State" },
          { key: "totalBookings", label: "Total Bookings" },
          { key: "completedStays", label: "Completed Stays" },
          { key: "totalSpent", label: "Total Spent (₹)" },
          { key: "createdAt", label: "Registered At" },
        ];

        const rows = customers.map((c) => {
          const b = bMap.get(String(c._id));
          const i = iMap.get(String(c._id));
          return {
            customerId: c.customerId,
            fullName: c.fullName,
            phone: c.phone,
            email: c.email || "—",
            location: [c.city, c.state].filter(Boolean).join(", ") || "—",
            totalBookings: b?.totalBookings || 0,
            completedStays: b?.completedStays || 0,
            totalSpent: i?.totalSpent || 0,
            createdAt: new Date(c.createdAt).toLocaleDateString(),
          };
        });

        csvData = formatCsv(headers, rows);
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid export type specified." }, { status: 400 });
    }

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
