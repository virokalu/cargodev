import { requireUser } from "@/lib/services/auth-guard";
import { listStaff } from "@/lib/services/user.service";
import { UsersTable } from "@/components/users/users-table";

// US-02: only Administrators see the Users screen at all — everyone else is
// redirected before any staff data is fetched.
export default async function UsersPage() {
  const user = await requireUser(["ADMINISTRATOR"]);
  const staff = await listStaff(user.orgId);

  return <UsersTable staff={staff} currentUserId={user.id} />;
}
