import type { Metadata } from "next";

// Public page — lives outside the (auth) and (dashboard) route groups so it
// can be opened without signing in. Apple's App Store Connect requires a
// publicly reachable Privacy Policy URL (https://<domain>/privacy).

export const metadata: Metadata = {
  title: "Privacy Policy — CargoDev",
  description: "How CargoDev collects and uses information.",
};

// TODO: replace with the real support address before submitting to App Store.
const CONTACT_EMAIL = "operations@ftjexports.com";
const LAST_UPDATED = "26 September 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6">
        CargoDev is an internal vehicle import management system used by staff
        of FTJ Exports to track vehicles from overseas auction to customer
        handover. This policy explains what information the CargoDev web and
        mobile apps collect and how it is used.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Information we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Email address</strong> — used to create your account and sign
          you in.
        </li>
        <li>
          <strong>User ID</strong> — an internal identifier that links your
          account to your role and to the actions you take in the app.
        </li>
        <li>
          <strong>Device push token</strong> — if you enable notifications on
          the mobile app, a token issued for your device so we can deliver
          alerts to it.
        </li>
        <li>
          <strong>Business records you or your colleagues enter</strong> — such
          as vehicle details, shipment status and remarks. This is operational
          data for FTJ Exports, not personal data collected from app users.
        </li>
      </ul>
      <p className="mt-2">
        We do not collect location data, contacts, photos, advertising
        identifiers, or payment information through the app.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How we use it</h2>
      <p className="mt-2">
        Only to run the app: authenticating you, enforcing role-based access,
        recording who made each change, and sending notifications you have
        enabled. We do not use your information for advertising.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Tracking and sharing</h2>
      <p className="mt-2">
        We do not track you across other companies&apos; apps or websites, and
        we do not sell or share your information with advertisers or data
        brokers. Information is shared only with the service providers that host
        and operate CargoDev (for example, cloud hosting, database, email and
        push notification delivery), solely to provide the service.
      </p>
      <p className="mt-2">
        The web app uses Vercel Analytics and Speed Insights to measure page
        performance in aggregate. These do not use advertising cookies or
        follow you across sites.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Retention and deletion</h2>
      <p className="mt-2">
        Account information is kept while you have access to CargoDev. Activity
        logs are retained as part of the business audit trail. To have your
        account removed or your information corrected, contact us at the
        address below.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Security</h2>
      <p className="mt-2">
        Passwords are stored hashed, data is transmitted over HTTPS, and access
        is restricted by role. No system is perfectly secure, but we take
        reasonable steps to protect your information.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Changes to this policy</h2>
      <p className="mt-2">
        If we change this policy we will update the date above.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Contact</h2>
      <p className="mt-2">
        Questions or requests:{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>
    </main>
  );
}
