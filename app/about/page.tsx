import type { Metadata } from "next";
import Link from "next/link";

// Public page — outside the (auth) and (dashboard) route groups so it opens
// without signing in. Used as the "Marketing URL" in App Store Connect
// (https://<domain>/about).

export const metadata: Metadata = {
  title: "CargoDev — Vehicle Import Management",
  description:
    "Track imported vehicles from overseas auction win to customer handover.",
};

const CONTACT_EMAIL = "operations@ftjexports.com";

const FEATURES = [
  {
    title: "Every vehicle in one place",
    body: "Search and filter your whole stock by serial, chassis, brand, customer, destination and more.",
  },
  {
    title: "Export and local tracks",
    body: "Export vehicles follow the full shipping lifecycle; local vehicles get the details that matter for a local sale.",
  },
  {
    title: "Automatic shipment status",
    body: "Status moves from Pending to Booking Received to Shipped as dates are entered — no manual updates to forget.",
  },
  {
    title: "Notifications on the go",
    body: "Get alerts on your phone when something changes on a vehicle you care about.",
  },
  {
    title: "Role-based access",
    body: "Administrators, Managers, Operators and Viewers each see and change only what their role allows.",
  },
  {
    title: "Full audit trail",
    body: "Every change is logged with who made it and when, and remarks can never be edited or deleted.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-relaxed text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">CargoDev</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Vehicle import management for FTJ Exports.
      </p>

      <p className="mt-6">
        CargoDev tracks imported vehicles from the moment an overseas auction
        is won to the day the vehicle is handed over to the customer. It gives
        the FTJ Exports team one shared, always-current view of every vehicle,
        on the web and on mobile.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <section key={feature.title} className="rounded-lg border p-4">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-1 text-muted-foreground">{feature.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-muted-foreground">
        CargoDev is an internal tool for FTJ Exports staff. Accounts are issued
        by an administrator.
      </p>

      <p className="mt-6">
        Questions?{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        {" · "}
        <Link className="underline" href="/support">
          Support
        </Link>
        {" · "}
        <Link className="underline" href="/privacy">
          Privacy Policy
        </Link>
      </p>
    </main>
  );
}
