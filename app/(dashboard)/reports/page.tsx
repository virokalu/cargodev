import { requireUser } from "@/lib/services/auth-guard";
import {
  getAuctionHallVehicleReport,
  getCustomerVehicleReport,
  getDestinationVehicleReport,
  getFreightAgentVehicleReport,
} from "@/lib/services/reports.service";
import { ReportsView } from "@/components/reports/reports-view";

// Any authenticated staff member can view Reports — it's read-only, same as
// the Customers list (CLAUDE.md RBAC rule: enforced server-side, not just by
// hiding UI, though there's nothing here to hide — every role sees the same
// thing). All four tabs' data is fetched up front rather than per-tab, and
// for both tracks (FC/FL) rather than just the default track for the three
// that need it — this app is Phase 1 scale (6-8 staff, one org), so seven
// small queries on page load is simpler than wiring per-tab/per-track
// loading states for no real performance benefit, and lets each panel's
// FC/FL toggle switch instantly with no refetch. Freight Agent has no
// FC/FL split (freight agents are never assigned to FL vehicles), so it's
// just the one query.
export default async function ReportsPage() {
  const user = await requireUser();
  const [customerFc, customerFl, auctionHallFc, auctionHallFl, destinationFc, destinationFl, freightAgentData] =
    await Promise.all([
      getCustomerVehicleReport(user.orgId, "FC"),
      getCustomerVehicleReport(user.orgId, "FL"),
      getAuctionHallVehicleReport(user.orgId, "FC"),
      getAuctionHallVehicleReport(user.orgId, "FL"),
      getDestinationVehicleReport(user.orgId, "FC"),
      getDestinationVehicleReport(user.orgId, "FL"),
      getFreightAgentVehicleReport(user.orgId),
    ]);

  return (
    <ReportsView
      customerData={{ fc: customerFc, fl: customerFl }}
      auctionHallData={{ fc: auctionHallFc, fl: auctionHallFl }}
      destinationData={{ fc: destinationFc, fl: destinationFl }}
      freightAgentData={freightAgentData}
    />
  );
}
