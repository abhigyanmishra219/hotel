import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only SYSTEM_ADMIN can manage managers across hotels
    const adminUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hotel ID format" },
        { status: 400 }
      );
    }

    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, managerId, name, email, password } = body;

    // ----------------------------------------------------
    // Action: CREATE NEW MANAGER
    // ----------------------------------------------------
    if (action === "create") {
      if (!name || !email) {
        return NextResponse.json(
          { error: "Manager name and email are required" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return NextResponse.json(
          { error: `User with email '${normalizedEmail}' already exists` },
          { status: 409 }
        );
      }

      const tempPassword = password && password.length >= 6
        ? password
        : `Mgr@${crypto.randomBytes(4).toString("hex")}`;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      const newManager = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: USER_ROLES.MANAGER, // Never allow arbitrary roles
        hotelId: hotel._id,
        mustChangePassword: true,
        isActive: true,
      });

      await logAudit({
        userId: adminUser.userId,
        hotelId: hotel._id,
        action: AUDIT_ACTIONS.MANAGER_CREATED,
        entity: "User",
        entityId: newManager._id.toString(),
        description: `Manager '${newManager.name}' (${newManager.email}) created for ${hotel.name}`,
        metadata: {
          managerName: newManager.name,
          managerEmail: newManager.email,
          hotelCode: hotel.hotelCode,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Manager created successfully",
          manager: {
            userId: newManager._id.toString(),
            name: newManager.name,
            email: newManager.email,
            role: newManager.role,
            hotelId: hotel._id.toString(),
            mustChangePassword: true,
            isActive: newManager.isActive,
          },
          temporaryPassword: tempPassword,
        },
        { status: 201 }
      );
    }

    // ----------------------------------------------------
    // Action: RESET MANAGER PASSWORD
    // ----------------------------------------------------
    if (action === "reset-password") {
      if (!managerId || !mongoose.Types.ObjectId.isValid(managerId)) {
        return NextResponse.json(
          { error: "Valid managerId is required" },
          { status: 400 }
        );
      }

      const manager = await User.findOne({
        _id: managerId,
        hotelId: hotel._id,
        role: USER_ROLES.MANAGER,
      });

      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found for this hotel" },
          { status: 404 }
        );
      }

      const newTempPassword = `Mgr@${crypto.randomBytes(4).toString("hex")}`;
      const salt = await bcrypt.genSalt(10);
      manager.password = await bcrypt.hash(newTempPassword, salt);
      manager.mustChangePassword = true;
      await manager.save();

      await logAudit({
        userId: adminUser.userId,
        hotelId: hotel._id,
        action: AUDIT_ACTIONS.MANAGER_PASSWORD_RESET,
        entity: "User",
        entityId: manager._id.toString(),
        description: `Temporary password generated & reset for manager '${manager.name}' (${manager.email})`,
        metadata: {
          managerName: manager.name,
          managerEmail: manager.email,
          hotelCode: hotel.hotelCode,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Password reset successfully for ${manager.name}`,
        temporaryPassword: newTempPassword,
      });
    }

    // ----------------------------------------------------
    // Action: TOGGLE ACTIVE / INACTIVE STATUS
    // ----------------------------------------------------
    if (action === "toggle-status") {
      if (!managerId || !mongoose.Types.ObjectId.isValid(managerId)) {
        return NextResponse.json(
          { error: "Valid managerId is required" },
          { status: 400 }
        );
      }

      const manager = await User.findOne({
        _id: managerId,
        hotelId: hotel._id,
        role: USER_ROLES.MANAGER,
      });

      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found for this hotel" },
          { status: 404 }
        );
      }

      manager.isActive = !manager.isActive;
      await manager.save();

      const auditAction = manager.isActive
        ? AUDIT_ACTIONS.MANAGER_ENABLED
        : AUDIT_ACTIONS.MANAGER_DISABLED;

      await logAudit({
        userId: adminUser.userId,
        hotelId: hotel._id,
        action: auditAction,
        entity: "User",
        entityId: manager._id.toString(),
        description: `Manager '${manager.name}' status changed to ${manager.isActive ? "ACTIVE" : "DISABLED"}`,
        metadata: {
          managerName: manager.name,
          managerEmail: manager.email,
          isActive: manager.isActive,
          hotelCode: hotel.hotelCode,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Manager ${manager.name} is now ${manager.isActive ? "ACTIVE" : "DEACTIVATED"}`,
        isActive: manager.isActive,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'create', 'reset-password', 'toggle-status'" },
      { status: 400 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
