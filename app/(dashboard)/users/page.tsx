import { requireUser } from "@/lib/services/auth-guard";
import { listStaff, isSuperAdmin } from "@/lib/services/user.service";
import { UsersTable } from "@/components/users/users-table";

// Administrator and Manager can view the Users screen; only Administrator
// can add, edit, or (de)activate staff — enforced again server-side in
// users/actions.ts. Operator and Viewer are redirected before any staff
// data is fetched.
export default async function UsersPage() {
  const user = await requireUser(["ADMINISTRATOR", "MANAGER"]);
  const staff = await listStaff(user);

  return (
    <UsersTable
      staff={staff}
      currentUserId={user.id}
      canManageUsers={user.role === "ADMINISTRATOR"}
      actorIsSuperAdmin={isSuperAdmin(user)}
    />
  );
}
