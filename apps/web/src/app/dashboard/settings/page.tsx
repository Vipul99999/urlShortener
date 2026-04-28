"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  updateProfileSchema,
  updateWorkspaceSchema,
} from "@/lib/validations/settings";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useToast } from "@/lib/hooks/use-toast";
import { formatWorkspaceRole } from "@/lib/utils/roles";

type MeResponse = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceMembership = {
  id: string;
  role: string;
  joinedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    brandingTitle: string | null;
    plan: string;
    createdAt: string;
  };
};

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    createdAt: string;
  };
};

type DomainItem = {
  id: string;
  hostname: string;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  verificationPath: string | null;
  shortBaseUrl: string;
  linkCount?: number;
};

type DomainDiagnostics = DomainItem & {
  linkCount: number;
  expectedTargetHost: string | null;
  verificationReady: boolean;
  assignmentAllowed: boolean;
  dns: {
    cnameRecords: string[];
    aRecords: string[];
    pointsToExpectedTarget: boolean;
  };
  issues: string[];
  recommendations: string[];
};

type OpsOverview = {
  storage: {
    provider: string;
  };
  exportHealth: {
    pendingExports: number;
    failedExports: number;
  };
  activeApiKeys: number;
  recentEmailEvents: Array<{
    id: string;
    provider: string;
    emailType: string;
    recipient: string | null;
    eventType: string;
    status: string | null;
    createdAt: string;
  }>;
  recentAbuseSignals: Array<{
    id: string;
    source: string;
    kind: string;
    hostname: string | null;
    path: string | null;
    actionTaken: string | null;
    createdAt: string;
  }>;
};

export default function SettingsPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore();
  const toast = useToast();

  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceMembership | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [opsOverview, setOpsOverview] = useState<OpsOverview | null>(null);
  const [domainDiagnostics, setDomainDiagnostics] = useState<
    Record<string, DomainDiagnostics>
  >({});

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [brandingTitle, setBrandingTitle] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [domainActionId, setDomainActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {},
  );
  const [workspaceErrors, setWorkspaceErrors] = useState<
    Record<string, string>
  >({});
  const dnsTarget = (() => {
    try {
      const explicitTarget = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_TARGET_HOST;
      if (explicitTarget) {
        return explicitTarget;
      }
      return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
        .hostname;
    } catch {
      return "your-api-host.example.com";
    }
  })();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const load = async () => {
      if (!accessToken || !workspaceId) return;

      try {
        setLoading(true);
        setError("");

        const [me, memberships, workspaceMembers, workspaceDomains, ops] = await Promise.all([
          apiFetch<MeResponse>("/users/me", { token: accessToken }),
          apiFetch<WorkspaceMembership[]>("/workspaces", {
            token: accessToken,
          }),
          apiFetch<Member[]>(`/workspaces/${workspaceId}/members`, {
            token: accessToken,
          }),
          apiFetch<DomainItem[]>(`/workspaces/${workspaceId}/domains`, {
            token: accessToken,
          }),
          apiFetch<OpsOverview>(`/workspaces/${workspaceId}/ops/overview`, {
            token: accessToken,
          }),
        ]);

        const currentWorkspace =
          memberships.find((item) => item.workspace.id === workspaceId) ||
          memberships[0];

        setProfile(me);
        setWorkspace(currentWorkspace || null);
        setMembers(workspaceMembers);
        setDomains(workspaceDomains);
        setOpsOverview(ops);

        setName(me.name || "");
        setAvatarUrl(me.avatarUrl || "");
        setWorkspaceName(currentWorkspace?.workspace.name || "");
        setBrandingTitle(currentWorkspace?.workspace.brandingTitle || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken, workspaceId]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setProfileErrors({});
    setError("");
    setSuccess("");

    const parsed = updateProfileSchema.safeParse({
      name,
      avatarUrl,
    });

    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setProfileErrors(fieldErrors);
      setError(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    try {
      setSavingProfile(true);

      const updated = await apiFetch<MeResponse>("/users/me", {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          name: parsed.data.name,
          avatarUrl: parsed.data.avatarUrl || null,
        }),
      });

      setProfile(updated);
      setSuccess("Profile updated successfully.");
      toast.success("Profile updated successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const reloadDomains = async () => {
    if (!accessToken || !workspaceId) return;

    const items = await apiFetch<DomainItem[]>(`/workspaces/${workspaceId}/domains`, {
      token: accessToken,
    });
    setDomains(items);
  };

  const loadDomainDiagnostics = async (domainId: string) => {
    if (!accessToken || !workspaceId) return;

    const diagnostics = await apiFetch<DomainDiagnostics>(
      `/workspaces/${workspaceId}/domains/${domainId}/diagnostics`,
      {
        token: accessToken,
      },
    );

    setDomainDiagnostics((prev) => ({
      ...prev,
      [domainId]: diagnostics,
    }));
  };

  const handleWorkspaceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !workspaceId) return;

    setWorkspaceErrors({});
    setError("");
    setSuccess("");

    const parsed = updateWorkspaceSchema.safeParse({
      name: workspaceName,
      brandingTitle,
    });

    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setWorkspaceErrors(fieldErrors);
      setError(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    try {
      setSavingWorkspace(true);

      const updated = await apiFetch<WorkspaceMembership["workspace"]>(
        `/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          token: accessToken,
          body: JSON.stringify({
            name: parsed.data.name,
            brandingTitle: parsed.data.brandingTitle || "",
          }),
        },
      );

      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              workspace: updated,
            }
          : prev,
      );

      setSuccess("Workspace updated successfully.");
      toast.success("Workspace updated successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update workspace";
      setError(message);
      toast.error(message);
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleDomainCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !workspaceId || !customDomain.trim()) return;

    try {
      setSavingDomain(true);
      setError("");
      setSuccess("");

      await apiFetch(`/workspaces/${workspaceId}/domains`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          hostname: customDomain.trim(),
        }),
      });

      setCustomDomain("");
      await reloadDomains();
      setSuccess("Custom domain added. Point it to your app and open the verification path on that host.");
      toast.success("Custom domain added.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add custom domain";
      setError(message);
      toast.error(message);
    } finally {
      setSavingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!accessToken || !workspaceId) return;
    if (!window.confirm("Remove this custom domain? Links using it will move back to the default domain.")) return;

    try {
      await apiFetch(`/workspaces/${workspaceId}/domains/${domainId}`, {
        method: "DELETE",
        token: accessToken,
      });

      await reloadDomains();
      toast.success("Custom domain removed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove custom domain";
      setError(message);
      toast.error(message);
    }
  };

  const handleRefreshVerification = async (domainId: string) => {
    if (!accessToken || !workspaceId) return;

    try {
      setDomainActionId(domainId);
      await apiFetch(`/workspaces/${workspaceId}/domains/${domainId}/refresh-verification`, {
        method: "POST",
        token: accessToken,
      });

      await reloadDomains();
      await loadDomainDiagnostics(domainId);
      toast.success("Verification instructions refreshed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh verification";
      setError(message);
      toast.error(message);
    } finally {
      setDomainActionId(null);
    }
  };

  const handleStatusUpdate = async (
    domainId: string,
    status: "PENDING" | "DISABLED",
  ) => {
    if (!accessToken || !workspaceId) return;

    try {
      setDomainActionId(domainId);
      await apiFetch(`/workspaces/${workspaceId}/domains/${domainId}/status`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ status }),
      });

      await reloadDomains();
      await loadDomainDiagnostics(domainId);
      toast.success(
        status === "DISABLED"
          ? "Domain disabled."
          : "Domain moved back to pending verification.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update domain status";
      setError(message);
      toast.error(message);
    } finally {
      setDomainActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <FormMessage error={error} success={success} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold">Profile</h3>
          <p className="mt-2 text-white/60">Update your profile information.</p>

          <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
            <TextField
              label="Email"
              value={profile?.email || ""}
              onChange={() => {}}
              disabled
            />

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <p className="text-sm text-white/50">Email verification</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    profile?.emailVerified
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {profile?.emailVerified ? "Verified" : "Not verified"}
                </span>

                {!profile?.emailVerified ? (
                  <a
                    href="/resend-verification"
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Resend verification
                  </a>
                ) : null}
              </div>
            </div>
            <TextField
              label="Name"
              value={name}
              onChange={setName}
              error={profileErrors.name}
            />

            <TextField
              label="Avatar URL"
              value={avatarUrl}
              onChange={setAvatarUrl}
              placeholder="https://example.com/avatar.png"
              error={profileErrors.avatarUrl}
            />

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold">Workspace</h3>
          <p className="mt-2 text-white/60">
            Control workspace naming and branding.
          </p>

          <form onSubmit={handleWorkspaceSave} className="mt-6 space-y-4">
            <TextField
              label="Workspace name"
              value={workspaceName}
              onChange={setWorkspaceName}
              error={workspaceErrors.name}
            />

            <TextField
              label="Branding title"
              value={brandingTitle}
              onChange={setBrandingTitle}
              placeholder="My Shortener Dashboard"
              error={workspaceErrors.brandingTitle}
            />

            <Button type="submit" disabled={savingWorkspace}>
              {savingWorkspace ? "Saving..." : "Save workspace"}
            </Button>
            <div className="pt-2">
              <a
                href="/dashboard/change-password"
                className="text-sm text-cyan-300 hover:text-cyan-200"
              >
                Change password
              </a>
            </div>
          </form>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-semibold">Workspace members</h3>
        <p className="mt-2 text-white/60">
          See who has access to this workspace.
        </p>

        <div className="mt-6 space-y-4">
          {members.length === 0 ? (
            <p className="text-white/60">No members found.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center"
              >
                <div>
                  <p className="font-medium text-white">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="text-sm text-white/55">{member.user.email}</p>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                    {formatWorkspaceRole(member.role)}
                  </span>
                  <span className="text-white/45">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold">Custom domains</h3>
        <p className="mt-2 text-white/60">
          Add branded domains for short links. After adding one, point the domain at your deployed app and open its verification path on that hostname once.
        </p>

        <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="text-sm font-medium text-cyan-200">DNS setup guide</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <p>1. Create a subdomain such as <span className="text-white">go.example.com</span>.</p>
            <p>2. Add a <span className="text-white">CNAME</span> record pointing that hostname to <span className="text-cyan-300">{dnsTarget}</span>.</p>
            <p>3. Wait for DNS to propagate, then open the verification URL shown below on the custom domain itself.</p>
            <p>4. After verification, choose that domain when creating or editing links.</p>
          </div>
        </div>

        <form onSubmit={handleDomainCreate} className="mt-6 space-y-4">
          <TextField
            label="Hostname"
            value={customDomain}
            onChange={setCustomDomain}
            placeholder="go.example.com"
          />

          <Button type="submit" disabled={savingDomain}>
            {savingDomain ? "Adding..." : "Add custom domain"}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          {domains.filter((item) => item.hostname !== "default").length === 0 ? (
            <p className="text-white/60">No custom domains yet.</p>
          ) : (
            domains
              .filter((item) => item.hostname !== "default")
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-white">{item.hostname}</p>
                      <p className="mt-1 text-sm text-white/55">
                        Status: {item.status}
                        {item.verifiedAt
                          ? ` • Verified ${new Date(item.verifiedAt).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Short URL base: https://{item.hostname}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => loadDomainDiagnostics(item.id)}
                        disabled={domainActionId === item.id}
                      >
                        Check DNS
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleRefreshVerification(item.id)}
                        disabled={domainActionId === item.id}
                      >
                        Refresh verification
                      </Button>
                      {item.status === "DISABLED" ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleStatusUpdate(item.id, "PENDING")}
                          disabled={domainActionId === item.id}
                        >
                          Re-enable
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => handleStatusUpdate(item.id, "DISABLED")}
                          disabled={domainActionId === item.id}
                        >
                          Disable
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => handleDeleteDomain(item.id)}
                        disabled={domainActionId === item.id}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {item.verificationPath ? (
                    <div className="mt-3 rounded-2xl bg-slate-950/70 p-4 text-sm text-white/70">
                      <p className="font-medium text-white">Verification URL</p>
                      <p className="mt-2 break-all text-cyan-300">
                        https://{item.hostname}
                        {item.verificationPath}
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-white/55">
                        <p>DNS target: {dnsTarget}</p>
                        <p>Open the URL above in your browser after the CNAME resolves.</p>
                      </div>
                    </div>
                  ) : null}

                  {domainDiagnostics[item.id] ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white/70">
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="rounded-full bg-white/5 px-3 py-1">
                          Links using domain: {domainDiagnostics[item.id].linkCount}
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1">
                          Assignment allowed: {domainDiagnostics[item.id].assignmentAllowed ? "Yes" : "No"}
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1">
                          DNS seen: {domainDiagnostics[item.id].verificationReady ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="font-medium text-white">DNS diagnostics</p>
                        <p>
                          Expected target:{" "}
                          <span className="text-cyan-300">
                            {domainDiagnostics[item.id].expectedTargetHost || dnsTarget}
                          </span>
                        </p>
                        <p>
                          CNAME records:{" "}
                          {domainDiagnostics[item.id].dns.cnameRecords.length > 0
                            ? domainDiagnostics[item.id].dns.cnameRecords.join(", ")
                            : "None found"}
                        </p>
                        <p>
                          A records:{" "}
                          {domainDiagnostics[item.id].dns.aRecords.length > 0
                            ? domainDiagnostics[item.id].dns.aRecords.join(", ")
                            : "None found"}
                        </p>
                        <p>
                          Points to expected target:{" "}
                          {domainDiagnostics[item.id].dns.pointsToExpectedTarget ? "Yes" : "No"}
                        </p>
                      </div>

                      {domainDiagnostics[item.id].issues.length > 0 ? (
                        <div className="mt-4">
                          <p className="font-medium text-amber-300">Issues</p>
                          <div className="mt-2 space-y-1">
                            {domainDiagnostics[item.id].issues.map((issue) => (
                              <p key={issue} className="text-amber-200">
                                {issue}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {domainDiagnostics[item.id].recommendations.length > 0 ? (
                        <div className="mt-4">
                          <p className="font-medium text-white">Recommendations</p>
                          <div className="mt-2 space-y-1">
                            {domainDiagnostics[item.id].recommendations.map(
                              (recommendation) => (
                                <p key={recommendation}>{recommendation}</p>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold">Delivery and operations</h3>
          <p className="mt-2 text-white/60">
            Keep an eye on export backlog, API access, and recent email delivery events.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-white/50">Storage</p>
              <p className="mt-2 text-xl font-semibold uppercase">
                {opsOverview?.storage.provider || "local"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-white/50">Queued exports</p>
              <p className="mt-2 text-xl font-semibold">
                {opsOverview?.exportHealth.pendingExports ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs text-white/50">Active API keys</p>
              <p className="mt-2 text-xl font-semibold">
                {opsOverview?.activeApiKeys ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {opsOverview?.recentEmailEvents?.length ? (
              opsOverview.recentEmailEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-white">{event.eventType}</p>
                      <p className="text-sm text-white/55">
                        {event.recipient || "Unknown recipient"} via {event.provider}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                      {event.status || "received"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="mt-6 text-white/60">No recent email delivery events yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold">Security review</h3>
          <p className="mt-2 text-white/60">
            Abuse incidents and SSL expectations for production custom domains.
          </p>

          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-white/70">
            <p className="font-medium text-emerald-200">SSL expectation</p>
            <p className="mt-2">
              Every custom hostname must terminate HTTPS before you send users to it. In production,
              point the CNAME to your edge or hosting provider and confirm that certificates are
              issued before turning the domain on for campaigns.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {opsOverview?.recentAbuseSignals?.length ? (
              opsOverview.recentAbuseSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-white">{signal.kind.replace(/_/g, " ")}</p>
                      <p className="text-sm text-white/55">
                        {signal.hostname || "default domain"}
                        {signal.path ? ` ${signal.path}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">
                      {signal.actionTaken || "flagged"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="mt-6 text-white/60">No recent abuse signals in this workspace.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-semibold">Launch readiness</h3>
        <p className="mt-2 text-white/60">
          The final production checks that matter most for a startup launch.
        </p>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-white/50">CDN / WAF</p>
            <p className="mt-2 text-sm text-white/75">
              Put public redirect traffic behind Cloudflare or another edge layer before launch.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-white/50">Backups</p>
            <p className="mt-2 text-sm text-white/75">
              Make sure Postgres backups and export storage backups are enabled and restorable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-white/50">Secrets</p>
            <p className="mt-2 text-sm text-white/75">
              Use strong production secrets for JWT, storage, email, and alert providers.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-white/50">Worker health</p>
            <p className="mt-2 text-sm text-white/75">
              Confirm exports, email jobs, and click processing are running on the worker continuously.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
