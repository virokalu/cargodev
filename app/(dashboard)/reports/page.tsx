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
// thing). All three tabs' data is fetched up front rather than per-tab —
// this app is Phase 1 scale (6-8 staff, one org), so three small queries on
// page load is simpler than wiring per-tab loading states for no real
// performance benefit.
export default async function ReportsPage() {
  const user = await requireUser();
  const [customerData, auctionHallData, destinationData] = await Promise.all([
    getCustomerVehicleReport(user.orgId),
    getAuctionHallVehicleReport(user.orgId),
    getDestinationVehicleReport(user.orgId),
  ]);

  return (
    <ReportsView customerData={customerData} auctionHallData={auctionHallData} destinationData={destinationData} />
  );
}
