"use client";

// Settings → Profile (US-03, CD-D2-17). Two independent cards — Profile
// Information and Password — each with its own save action, so fixing a
// typo'd phone number never requires re-entering your current password.
// Built from the same existing primitives (Card, Input, Label, Button) and
// the same local-state-object + Server Action pattern as
// components/users/user-form-dialog.tsx, rather than introducing a new form
// pattern for one screen.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, User, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { OwnProfile } from "@/lib/services/user.service";
import { updateProfileDetailsAction, changePasswordAction } from "@/app/(dashboard)/settings/actions";

interface ProfileFormProps {
  profile: OwnProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfileDetailsCard profile={profile} />
      <PasswordCard email={profile.email} />
    </div>
  );
}

function ProfileDetailsCard({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});
    setSaved(false);

    const result = await updateProfileDetailsAction({ name, email, phone });

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setBannerError(result.message);
      setSubmitting(false);
      return;
    }

    // Push the new name into the session's JWT (see lib/auth.ts's jwt
    // callback trigger==="update" branch) before refreshing — otherwise the
    // sidebar/header keep showing the name from when this session's JWT was
    // first issued, since a JWT session never re-reads the database on its
    // own between logins.
    await updateSession({ name });

    setSubmitting(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <User className="size-5 text-primary" />
          Profile Information
        </CardTitle>
        <CardDescription>Your name, email, and phone number, visible to other staff.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bannerError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        )}
        {saved && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            Profile updated.
          </p>
        )}

        <div>
          <Label htmlFor="profile-name" className="mb-1.5">
            Profile Name<span className="text-destructive">*</span>
          </Label>
          <Input
            id="profile-name"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            aria-invalid={!!fieldErrors.name}
            className={fieldErrors.name ? "border-destructive" : undefined}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div>
          <Label htmlFor="profile-email" className="mb-1.5">
            Email<span className="text-destructive">*</span>
          </Label>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSaved(false);
            }}
            aria-invalid={!!fieldErrors.email}
            className={fieldErrors.email ? "border-destructive" : undefined}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
        </div>

        <div>
          <Label htmlFor="profile-phone" className="mb-1.5">
            Phone Number
          </Label>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSaved(false);
            }}
            aria-invalid={!!fieldErrors.phone}
            className={fieldErrors.phone ? "border-destructive" : undefined}
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_PASSWORD_STATE = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Tells the BROWSER's own credential manager the account's password changed,
 * so it stops offering the stale saved one on the login page. This is the
 * secure alternative to the app "remembering" a real password itself: the
 * app never stores or has access to plaintext passwords once a request
 * completes (only a one-way bcrypt hash), so the only place a real password
 * value can safely live is the browser's own protected credential store —
 * this just keeps that store in sync.
 *
 * Feature-detected because only Chromium browsers support it (Firefox/Safari
 * don't) — this must always be best-effort and never block the actual
 * password-change flow if it's unavailable or the browser declines to save.
 */
async function syncBrowserCredential(email: string, newPassword: string) {
  if (typeof window === "undefined" || !("PasswordCredential" in window) || !navigator.credentials?.store) {
    return;
  }
  try {
    const PasswordCredentialCtor = window.PasswordCredential as new (
      data: { id: string; password: string }
    ) => Credential;
    const credential = new PasswordCredentialCtor({ id: email, password: newPassword });
    await navigator.credentials.store(credential);
  } catch {
    // Browser declined (e.g. user dismissed the save prompt) or an
    // unsupported shape — never surface this as an error to the user.
  }
}

function PasswordCard({ email }: { email: string | null }) {
  const [state, setState] = useState(EMPTY_PASSWORD_STATE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function setField<K extends keyof typeof EMPTY_PASSWORD_STATE>(key: K, value: string) {
    setState((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});
    setSaved(false);

    const result = await changePasswordAction(state);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setBannerError(result.message);
      setSubmitting(false);
      return;
    }

    if (email) {
      await syncBrowserCredential(email, state.newPassword);
    }

    setSubmitting(false);
    setSaved(true);
    // The password just entered as "New Password" is now the account's
    // current password — carry it into that field so a staff member who
    // wants to change it again right away doesn't have to retype it.
    setState({ currentPassword: state.newPassword, newPassword: "", confirmPassword: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Lock className="size-5 text-primary" />
          Password
        </CardTitle>
        <CardDescription>Change the password used to sign in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bannerError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        )}
        {saved && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            Password changed.
          </p>
        )}

        <div>
          <Label htmlFor="current-password" className="mb-1.5">
            Current Password<span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              // "off" discourages the browser from offering to fill this
              // field in the first place, but Chrome/Edge ignore that for
              // password fields more often than not — so it isn't sufficient
              // on its own. The "detect-autofill" class + onAnimationStart
              // below is the actual fix: it catches the moment the browser
              // injects its saved (possibly stale, e.g. a password the user
              // already changed via this same form) credential and wipes it
              // immediately, so this field only ever shows what the user
              // actually typed.
              autoComplete="off"
              value={state.currentPassword}
              onChange={(e) => setField("currentPassword", e.target.value)}
              onAnimationStart={(e) => {
                if (e.animationName === "onAutoFillStart") {
                  setField("currentPassword", "");
                }
              }}
              aria-invalid={!!fieldErrors.currentPassword}
              className={`detect-autofill ${fieldErrors.currentPassword ? "border-destructive pr-9" : "pr-9"}`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.currentPassword && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.currentPassword}</p>
          )}
        </div>

        <div>
          <Label htmlFor="new-password" className="mb-1.5">
            New Password<span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={state.newPassword}
              onChange={(e) => setField("newPassword", e.target.value)}
              placeholder="Minimum 8 characters"
              aria-invalid={!!fieldErrors.newPassword}
              className={fieldErrors.newPassword ? "border-destructive pr-9" : "pr-9"}
            />
            <button
              type="button"
              onClick={() => setShowNew((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.newPassword && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.newPassword}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm-password" className="mb-1.5">
            Confirm New Password<span className="text-destructive">*</span>
          </Label>
          <Input
            id="confirm-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            value={state.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            aria-invalid={!!fieldErrors.confirmPassword}
            className={fieldErrors.confirmPassword ? "border-destructive" : undefined}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Reset Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}