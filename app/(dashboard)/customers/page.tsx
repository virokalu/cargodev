import { requireUser } from "@/lib/services/auth-guard";
import { listCustomers } from "@/lib/services/customer.service";
import { COUNTRIES } from "@/lib/constants/countries";
import { CustomersTable } from "@/components/customers/customers-table";

// Any authenticated staff member can view the Customers list; only Manager
// and Administrator can add/edit (US-02 — "Manager additionally manages
// customers"), enforced again server-side in customers/actions.ts.
export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await listCustomers(user.orgId);
  const canManage = user.role === "ADMINISTRATOR" || user.role === "MANAGER";

  return <CustomersTable customers={customers} countries={COUNTRIES} canManage={canManage} />;
}
