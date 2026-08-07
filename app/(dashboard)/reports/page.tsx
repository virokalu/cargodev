import { requireUser } from "@/lib/services/auth-guard";
import {
  getAuctionHallVehicleReport,
  getCustomerVehicleReport,
  getDestinationVehicleReport,
} from "@/lib/services/reports.service";
import { ReportsView } from "@/components/reports/reports-view";

// Any authenticated staff member can view Reports — it's read-only, same as
// the Customers list (CLAUDE.md RBAC rule: enforced server-side, not just by
// hiding UI, though there's nothing here to hide — every role sees the same
// thing). All three tabs' data is fetched up front rather than per-tab, and
// for both tracks (FC/FL) rather than just the default track — this app is
// Phase 1 scale (6-8 staff, one org), so six small queries on page load is
// simpler than wiring per-tab/per-track loading states for no real
// performance benefit, and lets the FC/FL toggle in each panel switch
// instantly with no refetch.
export default async function ReportsPage() {
  const user = await requireUser();
  const [customerFc, customerFl, auctionHallFc, auctionHallFl, destinationFc, destinationFl] = await Promise.all([
    getCustomerVehicleReport(user.orgId, "FC"),
    getCustomerVehicleReport(user.orgId, "FL"),
    getAuctionHallVehicleReport(user.orgId, "FC"),
    getAuctionHallVehicleReport(user.orgId, "FL"),
    getDestinationVehicleReport(user.orgId, "FC"),
    getDestinationVehicleReport(user.orgId, "FL"),
  ]);

  return (
    <ReportsView
      customerData={{ fc: customerFc, fl: customerFl }}
      auctionHallData={{ fc: auctionHallFc, fl: auctionHallFl }}
      destinationData={{ fc: destinationFc, fl: destinationFl }}
    />
  );
}
