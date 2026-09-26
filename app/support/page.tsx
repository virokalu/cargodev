import type { Metadata } from "next";
import Link from "next/link";

// Public page — outside the (auth) and (dashboard) route groups so it opens
// without signing in. Used as the "Support URL" in App Store Connect
// (https://<domain>/support).

export const metadata: Metadata = {
  title: "Support — CargoDev",
  description: "Get help with the CargoDev app.",
};

const CONTACT_EMAIL = "operations@ftjexports.com";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-semibold">CargoDev Support</h1>
      <p className="mt-2 text-muted-foreground">
        Help for FTJ Exports staff using the CargoDev app.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Contact us</h2>
      <p className="mt-2">
        Email{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        and we&apos;ll get back to you. Please include your name, the email
        address on your CargoDev account, and a short description of the
        problem (a screenshot helps).
      </p>

      <h2 className="mt-8 text-lg font-semibold">Common questions</h2>
      <dl className="mt-2 space-y-4">
        <div>
          <dt className="font-medium">How do I get an account?</dt>
          <dd className="text-muted-foreground">
            CargoDev is an internal tool for FTJ Exports staff. Accounts are
            created by an administrator — email us to request access.
          </dd>
        </div>
        <div>
          <dt className="font-medium">I forgot my password.</dt>
          <dd className="text-muted-foreground">
            Contact your administrator or email us and we&apos;ll reset it for
            you.
          </dd>
        </div>
        <div>
          <dt className="font-medium">I can&apos;t edit a vehicle.</dt>
          <dd className="text-muted-foreground">
            What you can change depends on your role (Administrator, Manager,
            Operator or Viewer). Ask your administrator if you need a different
            level of access.
          </dd>
        </div>
        <div>
          <dt className="font-medium">I&apos;m not getting notifications.</dt>
          <dd className="text-muted-foreground">
            Check that notifications are allowed for CargoDev in your
            device&apos;s settings, then sign out and back in.
          </dd>
        </div>
        <div>
          <dt className="font-medium">How do I delete my account or data?</dt>
          <dd className="text-muted-foreground">
            Email us and we&apos;ll handle the request. See our{" "}
            <Link className="underline" href="/privacy">
              Privacy Policy
            </Link>{" "}
            for details.
          </dd>
        </div>
      </dl>
    </main>
  );
}
