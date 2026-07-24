import { requireUser } from "@/lib/services/auth-guard";
import { getOwnProfile } from "@/lib/services/user.service";
import { ProfileForm } from "@/components/settings/profile-form";

// US-03: every authenticated staff member edits their own profile, so this
// page carries no role restriction — unlike /users, which is Admin-only.
export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.orgId, user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account details.</p>
        </div>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}