import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import User from "@/models/User";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import HotelSubscription from "@/models/HotelSubscription";
import Room from "@/models/Room";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check: Only SYSTEM_ADMIN can access dashboard stats
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    // 2. Fetch High-Level KPI Aggregations in Parallel for Optimal Performance
    const [
      totalHotels,
      activeHotels,
      suspendedHotels,
      inactiveHotels,
      totalUsers,
      totalRooms,
      allSubscriptions,
      allPlans,
      recentHotelsRaw,
      latestSubscriptionsRaw,
      latestUsersRaw,
    ] = await Promise.all([
      Hotel.countDocuments({}),
      Hotel.countDocuments({ status: "ACTIVE" }),
      Hotel.countDocuments({ status: "SUSPENDED" }),
      Hotel.countDocuments({ status: "INACTIVE" }),
      User.countDocuments({}),
      Room.countDocuments({}),
      HotelSubscription.find({ isCurrent: true })
        .populate("planId")
        .populate("hotelId")
        .lean(),
      SubscriptionPlan.find({}).sort({ monthlyPrice: 1 }).lean(),
      Hotel.find({}).sort({ createdAt: -1 }).limit(6).lean(),
      HotelSubscription.find({})
        .sort({ createdAt: -1 })
        .populate("hotelId")
        .populate("planId")
        .limit(6)
        .lean(),
      User.find({})
        .sort({ createdAt: -1 })
        .populate("hotelId")
        .limit(6)
        .lean(),
    ]);

    // 3. Subscription & Revenue Calculations
    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;
    let trialSubscriptions = 0;
    let suspendedSubscriptions = 0;
    let monthlySubscriptionRevenue = 0;

    // Build Plan Stats Map
    const planStatsMap = new Map<string, any>();
    allPlans.forEach((plan) => {
      planStatsMap.set(plan._id.toString(), {
        _id: plan._id,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        status: plan.status,
        maxRooms: plan.maxRooms,
        maxStaff: plan.maxStaff,
        maxReceptionists: plan.maxReceptionists,
        features: plan.features || [],
        totalHotels: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        trialSubscriptions: 0,
        suspendedSubscriptions: 0,
        monthlyRevenue: 0,
      });
    });

    allSubscriptions.forEach((sub: any) => {
      if (sub.status === "ACTIVE") {
        activeSubscriptions++;
      } else if (sub.status === "EXPIRED") {
        expiredSubscriptions++;
      } else if (sub.status === "TRIAL") {
        trialSubscriptions++;
      } else if (sub.status === "SUSPENDED") {
        suspendedSubscriptions++;
      }

      const plan = sub.planId;
      if (plan && plan._id) {
        const planIdStr = plan._id.toString();
        const planStat = planStatsMap.get(planIdStr);
        if (planStat) {
          planStat.totalHotels++;
          if (sub.status === "ACTIVE") {
            planStat.activeSubscriptions++;
            const price = Number(plan.monthlyPrice) || 0;
            planStat.monthlyRevenue += price;
            monthlySubscriptionRevenue += price;
          } else if (sub.status === "EXPIRED") {
            planStat.expiredSubscriptions++;
          } else if (sub.status === "TRIAL") {
            planStat.trialSubscriptions++;
          } else if (sub.status === "SUSPENDED") {
            planStat.suspendedSubscriptions++;
          }
        }
      }
    });

    const subscriptionOverview = Array.from(planStatsMap.values());

    // 4. Enrich Recent Hotels with Manager and Subscription Data
    const recentHotelIds = recentHotelsRaw.map((h) => h._id);

    const [managers, hotelSubs] = await Promise.all([
      User.find({
        hotelId: { $in: recentHotelIds },
        role: USER_ROLES.MANAGER,
      })
        .select("name email phone hotelId isActive")
        .lean(),
      HotelSubscription.find({
        hotelId: { $in: recentHotelIds },
        isCurrent: true,
      })
        .populate("planId")
        .lean(),
    ]);

    const managerByHotel = new Map<string, any>();
    managers.forEach((m: any) => {
      if (m.hotelId) {
        managerByHotel.set(m.hotelId.toString(), m);
      }
    });

    const subByHotel = new Map<string, any>();
    hotelSubs.forEach((s: any) => {
      if (s.hotelId) {
        subByHotel.set(s.hotelId.toString(), s);
      }
    });

    const recentHotels = recentHotelsRaw.map((hotel: any) => {
      const sub = subByHotel.get(hotel._id.toString());
      const plan = sub?.planId;

      return {
        _id: hotel._id,
        hotelCode: hotel.hotelCode,
        name: hotel.name,
        email: hotel.email,
        phone: hotel.phone,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        status: hotel.status,
        createdAt: hotel.createdAt,
        manager: managerByHotel.get(hotel._id.toString()) || null,
        subscription: sub
          ? {
              _id: sub._id,
              status: sub.status,
              paymentStatus: sub.paymentStatus,
              startDate: sub.startDate,
              endDate: sub.endDate,
              plan: plan
                ? {
                    _id: plan._id,
                    name: plan.name,
                    monthlyPrice: plan.monthlyPrice,
                    yearlyPrice: plan.yearlyPrice,
                  }
                : null,
            }
          : null,
      };
    });

    // 5. Recent Activity Feed Consolidation
    const activities: Array<{
      id: string;
      type: "HOTEL_CREATED" | "SUBSCRIPTION_CHANGE" | "USER_REGISTERED";
      title: string;
      description: string;
      timestamp: Date | string;
      status?: string;
      link: string;
      badgeVariant: "amber" | "emerald" | "indigo" | "rose" | "cyan";
    }> = [];

    recentHotelsRaw.forEach((h: any) => {
      activities.push({
        id: `hotel-${h._id}`,
        type: "HOTEL_CREATED",
        title: `Hotel Onboarded: ${h.name}`,
        description: `Code ${h.hotelCode} · ${h.city || "Global"} · Status: ${h.status}`,
        timestamp: h.createdAt,
        status: h.status,
        link: `/admin/hotels/${h._id}`,
        badgeVariant: "amber",
      });
    });

    latestSubscriptionsRaw.forEach((s: any) => {
      const hotel = s.hotelId;
      const plan = s.planId;
      activities.push({
        id: `sub-${s._id}`,
        type: "SUBSCRIPTION_CHANGE",
        title: `Subscription ${s.status}: ${hotel?.name || "Hotel"}`,
        description: `Plan: ${plan?.name || "N/A"} (${s.changeReason || "Plan update"}) · Payment: ${s.paymentStatus}`,
        timestamp: s.createdAt,
        status: s.status,
        link: hotel?._id ? `/admin/hotels/${hotel._id}` : `/admin/subscriptions`,
        badgeVariant: s.status === "ACTIVE" ? "emerald" : "rose",
      });
    });

    latestUsersRaw.forEach((u: any) => {
      const hotel = u.hotelId;
      activities.push({
        id: `user-${u._id}`,
        type: "USER_REGISTERED",
        title: `User Added: ${u.name}`,
        description: `Role: ${u.role} · ${u.email}${hotel?.name ? ` (${hotel.name})` : ""}`,
        timestamp: u.createdAt,
        status: u.isActive ? "ACTIVE" : "INACTIVE",
        link: `/admin/users`,
        badgeVariant: "indigo",
      });
    });

    // Sort combined activities by date descending
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const recentActivity = activities.slice(0, 8);

    return NextResponse.json({
      success: true,
      kpis: {
        totalHotels,
        activeHotels,
        suspendedHotels,
        inactiveHotels,
        totalUsers,
        totalRooms,
        activeSubscriptions,
        expiredSubscriptions,
        trialSubscriptions,
        suspendedSubscriptions,
        monthlySubscriptionRevenue,
      },
      recentHotels,
      subscriptionOverview,
      recentActivity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
