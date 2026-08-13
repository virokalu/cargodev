"use client";

// The vehicle detail page (vehicle-detail-view.tsx) is a Server Component by
// design, so this one interactive bit — the Back arrow needing router.back()
// — is isolated into its own small client leaf, same pattern as
// DeleteVehicleDialog/ClickableRow elsewhere in this directory.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackToVehicles } from "@/components/vehicles/use-back-to-vehicles";

export function BackToVehiclesButton() {
  const { href, onClick } = useBackToVehicles();
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label="Back to vehicles"
      className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
    >
      <ArrowLeft className="size-4" />
    </Link>
  );
}
