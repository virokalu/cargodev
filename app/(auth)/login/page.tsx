import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import { getOrganizationName } from "@/lib/services/organization.service";
import { env } from "@/lib/env";

// useSearchParams() (inside LoginForm) must live inside a Suspense boundary
// in App Router. We wrap the whole form so the boundary is tight.
export default async function LoginPage() {
  const orgName = await getOrganizationName(env.ORG_ID);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm orgName={orgName} />
    </Suspense>
  );
}
