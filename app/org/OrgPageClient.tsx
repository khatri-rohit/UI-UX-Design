"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Crown,
  Loader2,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  OrgDetail,
  useCreateOrgMutation,
  useInviteMemberMutation,
  useLeaveOrgMutation,
  useOrgQuery,
  useRemoveMemberMutation,
  useRevokeInviteMutation,
} from "@/lib/org/queries";

const ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    badgeClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  },
  MEMBER: {
    label: "Member",
    icon: Users,
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
} as const;

function ProgressBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {current} / {max} seats
        </span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 90
              ? "bg-destructive"
              : pct >= 70
                ? "bg-orange-500"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MemberRow({
  membership,
  currentUserId,
  userRole,
  onRemove,
  isRemoving,
}: {
  membership: OrgDetail["memberships"][number];
  currentUserId: string;
  userRole: OrgDetail["userRole"];
  onRemove: (memberId: string) => void;
  isRemoving: boolean;
}) {
  const config = ROLE_CONFIG[membership.role];
  const isSelf = membership.user.id === currentUserId;
  const canRemove =
    (userRole === "OWNER" || userRole === "ADMIN") &&
    membership.role !== "OWNER" &&
    !isSelf;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {membership.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">
              {membership.user.name}
              {isSelf && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (you)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {membership.user.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            config.badgeClass,
          )}
        >
          <config.icon className="h-3 w-3" />
          {config.label}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(membership.joinedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onRemove(membership.id)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function InviteForm({
  maxSeats,
  seatCount,
  userRole,
}: {
  maxSeats: number;
  seatCount: number;
  userRole: OrgDetail["userRole"];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: invite, isPending } = useInviteMemberMutation();

  const isFull = seatCount >= maxSeats;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await invite({ email, role });
      setEmail("");
      toast.success(`Invitation sent to ${email}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send invitation.";
      setError(msg);
    }
  };

  if (userRole === "MEMBER") return null;
  if (isFull) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
        <p className="text-sm text-orange-700 dark:text-orange-400">
          Seat limit reached ({seatCount}/{maxSeats}). Remove a member or
          dissolve the org to invite new people.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium">Email address</label>
        <Input
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="w-32 space-y-1">
        <label className="text-sm font-medium">Role</label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="MEMBER">Member</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send Invite
      </Button>
      {error && (
        <p className="col-span-full text-sm text-destructive">{error}</p>
      )}
    </form>
  );
}

function LeaveOrgButton({ disabled }: { disabled: boolean }) {
  const { mutateAsync: leave, isPending } = useLeaveOrgMutation();
  const [confirm, setConfirm] = useState(false);

  const handleLeave = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    try {
      await leave();
      toast.success("You have left the organisation.");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave.");
      setConfirm(false);
    }
  };

  return (
    <div className="space-y-2">
      {confirm ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Are you sure?</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleLeave}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Yes, leave
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => handleLeave()}
          disabled={disabled}
        >
          <UserMinus className="h-4 w-4 mr-2" />
          Leave Organisation
        </Button>
      )}
    </div>
  );
}

function DissolveOrgButton({ orgName }: { orgName: string }) {
  const [confirmName, setConfirmName] = useState("");
  const [isDissolving, setIsDissolving] = useState(false);

  const handleDissolve = async () => {
    if (confirmName !== orgName) return;
    setIsDissolving(true);
    try {
      const res = await fetch("/api/org", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Organisation dissolved.");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to dissolve org.",
      );
      setIsDissolving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <h4 className="font-semibold">Dissolve Organisation</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        This will permanently delete the organisation and remove all members.
        This action <strong>cannot</strong> be undone.
      </p>
      <div className="space-y-2">
        <p className="text-sm">
          Type <code className="rounded bg-muted px-1 py-0.5">{orgName}</code>{" "}
          to confirm:
        </p>
        <Input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={orgName}
          className="max-w-xs"
        />
        <Button
          variant="destructive"
          onClick={handleDissolve}
          disabled={confirmName !== orgName || isDissolving}
        >
          {isDissolving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Dissolve {orgName}
        </Button>
      </div>
    </div>
  );
}

export default function OrgPageClient({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const { data: org, isLoading, error } = useOrgQuery();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { mutateAsync: removeMember } = useRemoveMemberMutation();
  const { mutateAsync: revokeInvite } = useRevokeInviteMutation();

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await removeMember(memberId);
      toast.success("Member removed.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      await revokeInvite(inviteId);
      toast.success("Invitation revoked.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke invite.",
      );
    } finally {
      setRevokingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">
          You are not part of any organisation yet.
        </p>
        <CreateOrgForm />
      </div>
    );
  }

  const isOwner = org.userRole === "OWNER";
  const isAdmin = org.userRole === "ADMIN" || isOwner;
  const canManage = isAdmin;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>@{org.slug}</span>
            <span>·</span>
            <ProgressBar current={org.seatCount} max={org.maxSeats} />
          </div>
        </div>

        {/* Active Members */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Members</h2>
            <span className="text-sm text-muted-foreground">
              {org.seatCount} of {org.maxSeats}
            </span>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManage && <TableHead className="w-20">Remove</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.memberships.map((m) => (
                  <MemberRow
                    key={m.id}
                    membership={m}
                    currentUserId={currentUserId}
                    userRole={org.userRole}
                    onRemove={handleRemoveMember}
                    isRemoving={removingId === m.id}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Pending Invitations */}
        {org.invitations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    {canManage && (
                      <TableHead className="w-20">Revoke</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            inv.role === "ADMIN"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                          )}
                        >
                          {inv.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvite(inv.id)}
                            disabled={revokingId === inv.id}
                          >
                            {revokingId === inv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Invite Form */}
        {canManage && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Invite Member</h2>
            <div className="rounded-lg border p-4">
              <InviteForm
                maxSeats={org.maxSeats}
                seatCount={org.seatCount}
                userRole={org.userRole}
              />
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <div className="rounded-lg border p-4 space-y-4">
            {!isOwner && <LeaveOrgButton disabled={false} />}
            {isOwner && <DissolveOrgButton orgName={org.name} />}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

function CreateOrgForm() {
  const [name, setName] = useState("");
  const { mutateAsync: createOrg, isPending } = useCreateOrgMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createOrg(name.trim());
      toast.success("Organisation created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create org.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">Organisation name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Design Co."
          className="w-64"
          required
          minLength={2}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Create Organisation
      </Button>
    </form>
  );
}
