"use client";

import React from "react";
import { Settings } from "lucide-react";
import ReceptionistPlaceholder from "@/components/receptionist/ReceptionistPlaceholder";

export default function ReceptionistSettingsPage() {
  return (
    <ReceptionistPlaceholder
      title="Front Desk Preferences & Security"
      phase="Phase 4 / System Configuration"
      description="Configure front-desk printer preferences, quick-dial extensions, and account security."
      icon={Settings}
      plannedFeatures={[
        "Default receipt and keycard printer routing",
        "Front desk notification audio and visual alerts",
        "Quick emergency contact and manager escalation directory",
        "Session timeout and workstation locking rules",
      ]}
    />
  );
}
