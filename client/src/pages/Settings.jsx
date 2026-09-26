import { useState } from "react";
import { useTheme } from "next-themes";
import { KeyRound, Loader2, Monitor, Moon, Palette, Save, ShieldCheck, Sun, User } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState } from "@/components/common/Feedback";
import { InlineNotice } from "@/components/common/StageProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatDate, initials } from "@/lib/constants";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function Section({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary/12 text-primary grid size-8 place-items-center rounded-lg">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    jobTitle: user?.jobTitle || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMsg(null);
    if (!profile.name.trim()) {
      setProfileError({ message: "Your name cannot be empty." });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: profile.name, jobTitle: profile.jobTitle, theme });
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileError(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);

    if (passwords.newPassword.length < 8) {
      setPasswordError({ message: "The new password must be at least 8 characters long." });
      return;
    }
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError({ message: "The two new passwords do not match." });
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordMsg("Password changed successfully.");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPasswordError(err);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account, appearance and security."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section
            icon={User}
            title="Profile"
            description="This information is stored on the server and never exposed to the browser beyond your own account."
          >
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-primary/15 text-primary text-base">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                <p className="text-muted-foreground text-xs">
                  Member since {formatDate(user?.createdAt)}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto capitalize">
                {user?.role}
              </Badge>
            </div>

            <Separator />

            <form onSubmit={saveProfile} className="space-y-4">
              {profileError && <ErrorState error={profileError} />}
              {profileMsg && (
                <InlineNotice type="success">{profileMsg}</InlineNotice>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Target role</Label>
                  <Input
                    id="jobTitle"
                    value={profile.jobTitle}
                    onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                    placeholder="e.g. Frontend Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-ro">Email</Label>
                <Input id="email-ro" value={user?.email || ""} disabled />
                <p className="text-muted-foreground text-xs">
                  Email is your login identifier and cannot be changed from here.
                </p>
              </div>

              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save changes
              </Button>
            </form>
          </Section>

          <Section
            icon={KeyRound}
            title="Password"
            description="Passwords are hashed with bcrypt and never stored in plain text."
          >
            <form onSubmit={savePassword} className="space-y-4">
              {passwordError && <ErrorState error={passwordError} />}
              {passwordMsg && <InlineNotice type="success">{passwordMsg}</InlineNotice>}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="outline" disabled={savingPassword}>
                {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Change password
              </Button>
            </form>
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            icon={Palette}
            title="Appearance"
            description="Choose light, dark or follow your system setting."
          >
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                    theme === value
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-accent"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="reduce-motion">Reduce animation</Label>
                <p className="text-muted-foreground text-xs">
                  Applied instantly for this browser session.
                </p>
              </div>
              <ReduceMotionSwitch />
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Security" description="How this app protects your data.">
            <ul className="space-y-2.5 text-sm">
              {[
                "JWT authentication on every protected route",
                "Passwords hashed with bcrypt (10 salt rounds)",
                "CORS locked to the single client origin",
                "Uploads restricted to PDF, DOCX, PNG and JPG under 10 MB",
                "MONGODB_URI, JWT_SECRET and your AI API key stay on the server",
                "Every query is scoped to your own user id",
              ].map((item) => (
                <li key={item} className="text-muted-foreground flex gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={Monitor} title="Job data" description="How job descriptions reach this app.">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Job descriptions are always supplied by you — pasted manually or imported from a source
              whose terms allow it. This project contains no scraper and never calls LinkedIn or any
              other job board on your behalf. If your team has access to an authorised jobs API, it
              can be connected to <code className="text-xs">POST /api/jobs</code> and normalised into
              the Job model.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}

function ReduceMotionSwitch() {
  const [reduced, setReduced] = useState(
    typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const toggle = (checked) => {
    setReduced(checked);
    document.documentElement.classList.toggle("motion-reduce", checked);
  };

  return <Switch id="reduce-motion" checked={reduced} onCheckedChange={toggle} />;
}
