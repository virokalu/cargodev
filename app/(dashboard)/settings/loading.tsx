import { PageHeaderSkeleton, FormSectionSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors ProfileForm's two stacked cards (Profile Information, Password) —
// shown while getOwnProfile() resolves.
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FormSectionSkeleton fields={3} />
      <FormSectionSkeleton fields={3} />
    </div>
  );
}
