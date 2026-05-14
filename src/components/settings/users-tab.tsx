"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Trash2, Shuffle } from "lucide-react";
import {
  deleteUserAction,
  inviteUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/(protected)/settings/user-actions";
import type { AppRole } from "@/lib/auth";

export type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  role: AppRole;
  is_active: boolean;
};

const ROLE_OPTIONS: Array<{ value: AppRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "programme_officer", label: "Programme officer" },
  { value: "me_lead", label: "M&E lead" },
  { value: "volunteer_coordinator", label: "Volunteer coordinator" },
  { value: "volunteer", label: "Volunteer" },
  { value: "viewer", label: "Viewer" },
];

function randomPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const cryptoObj =
    typeof window !== "undefined" && window.crypto ? window.crypto : undefined;
  if (cryptoObj) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
    return out;
  }
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function UsersTab({
  initial,
  currentUserId,
}: {
  initial: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => randomPassword());
  const [role, setRole] = useState<AppRole>("programme_officer");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("full_name", fullName);
      fd.set("username", username);
      fd.set("email", email);
      fd.set("password", password);
      fd.set("role", role);
      const result = await inviteUserAction(fd);
      if (result.ok) {
        setUsers((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            full_name: fullName,
            email,
            username,
            role,
            is_active: true,
          },
        ]);
        setFeedback({
          tone: "ok",
          text: `Invited ${username}. Password: ${password} — share it now, it won't be shown again.`,
        });
        setFullName("");
        setUsername("");
        setEmail("");
        setPassword(randomPassword());
        setRole("programme_officer");
      } else {
        setFeedback({ tone: "err", text: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">Invite a user</p>
          <p className="text-xs text-muted-foreground">
            Creates an active account immediately. Tell the new user their username + password — they
            can sign in with either that or Google (if their email matches).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="jane.doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value.toLowerCase())}
                placeholder="jane@adlaiheroes.org"
                type="email"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Initial password</Label>
              <div className="flex gap-2">
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPassword(randomPassword())}
                  title="Generate new password"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Min 8 chars. You&apos;ll see this once after creating.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {feedback ? (
              <p
                className={
                  feedback.tone === "ok"
                    ? "text-xs text-emerald-700 max-w-md break-words"
                    : "text-xs text-destructive max-w-md"
                }
              >
                {feedback.text}
              </p>
            ) : null}
            <Button onClick={invite} disabled={pending || !fullName.trim() || !username.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 divide-y">
          {users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No users yet.</p>
          ) : null}
          {users.map((user) => (
            <UserRowItem
              key={user.id}
              user={user}
              isSelf={user.id === currentUserId}
              onChange={(updated) =>
                setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)))
              }
              onDelete={() => setUsers((current) => current.filter((row) => row.id !== user.id))}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRowItem({
  user,
  isSelf,
  onChange,
  onDelete,
}: {
  user: UserRow;
  isSelf: boolean;
  onChange: (updated: UserRow) => void;
  onDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetValue, setResetValue] = useState(() => randomPassword());
  const [feedback, setFeedback] = useState<string | null>(null);

  function changeRole(nextRole: AppRole) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, nextRole);
      if (result.ok) onChange({ ...user, role: nextRole });
      else setFeedback(result.error);
    });
  }

  function toggleActive(next: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, next);
      if (result.ok) onChange({ ...user, is_active: next });
      else setFeedback(result.error);
    });
  }

  function resetPassword() {
    setFeedback(null);
    startTransition(async () => {
      const result = await resetUserPasswordAction(user.id, resetValue);
      if (result.ok) {
        setFeedback(`New password set: ${resetValue} — share it now.`);
        setResetOpen(false);
      } else {
        setFeedback(result.error);
      }
    });
  }

  function remove() {
    if (typeof window !== "undefined" && !window.confirm(`Delete ${user.username ?? user.email}? This cannot be undone.`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (result.ok) onDelete();
      else setFeedback(result.error);
    });
  }

  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">
            {user.full_name}
            {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
          </p>
          <p className="text-xs text-muted-foreground font-mono break-all">
            {user.username ?? "—"} · {user.email ?? "—"}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {!user.is_active ? (
              <Badge variant="secondary" className="font-normal text-[10px]">Inactive</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={user.role} onValueChange={(value) => changeRole(value as AppRole)}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={user.is_active}
              disabled={pending}
              onChange={(event) => toggleActive(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-input"
            />
            Active
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setResetValue(randomPassword());
              setResetOpen((open) => !open);
              setFeedback(null);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={remove} disabled={pending || isSelf}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {resetOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
          <Input
            value={resetValue}
            onChange={(event) => setResetValue(event.target.value)}
            className="h-8 max-w-xs font-mono text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setResetValue(randomPassword())}
            title="Regenerate"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={resetPassword} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set password"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : null}
      {feedback ? (
        <p
          className={
            feedback.startsWith("New password")
              ? "text-xs text-emerald-700 break-words"
              : "text-xs text-destructive"
          }
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
