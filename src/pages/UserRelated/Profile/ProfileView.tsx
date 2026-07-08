import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploader } from "./components/AvatarUploader";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  FolderOpen,
  Gamepad2,
  Trophy,
  Settings as SettingsIcon,
  Pencil,
  Activity,
  Lock,
} from "lucide-react";
import formatDate from "@/lib/date-format";
import { Button } from "@/components/ui";

/**
 * Presentational profile. Takes all its data as props so it can render either
 * the signed-in user's own profile (MyProfile container) or another user's
 * public profile (UserProfile container). `isOwnProfile` toggles the private
 * bits (email, last login, edit/settings actions).
 */
export type ProfileViewProps = {
  username: string;
  profileImageUrl?: string | null;
  roles?: string[];
  dateRegistered?: string;
  email?: string; // own profile only
  lastLogin?: string; // own profile only
  questionsCount?: number | null; // null/undefined → "—"
  quizzesCount?: number | null;
  isOwnProfile?: boolean;
};

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: string;
};

const StatCard = ({ icon: Icon, label, value, hint }: StatCardProps) => (
  <Card className="bg-background border dark:border-foreground/30">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right truncate">{value}</span>
  </div>
);

const stat = (n?: number | null) => (n === undefined || n === null ? "—" : n);

export const ProfileView = ({
  username,
  profileImageUrl,
  roles,
  dateRegistered,
  email,
  lastLogin,
  questionsCount,
  quizzesCount,
  isOwnProfile = false,
}: ProfileViewProps) => {
  const initials =
    typeof username === "string"
      ? username
          .split(" ")
          .map((name) => name[0])
          .join("")
          .toUpperCase()
      : "?";

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 max-w-4xl">
      {/* Identity banner */}
      <Card className="overflow-hidden mb-6 border dark:border-foreground/30 bg-background">
        <div className="h-28" />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {isOwnProfile ? (
              <AvatarUploader
                username={username}
                profileImageUrl={profileImageUrl}
                initials={initials}
              />
            ) : (
              <Avatar className="h-24 w-24 ring-1 ring-primary">
                <AvatarImage
                  src={profileImageUrl ?? undefined}
                  alt={username}
                />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
              <div>
                <h1 className="text-2xl font-bold leading-tight">{username}</h1>
                {isOwnProfile && email && (
                  <p className="text-sm text-muted-foreground">{email}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {roles?.length ? (
                    roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No role</Badge>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <Button disabled className="opacity-70 text-white">
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          icon={HelpCircle}
          label={isOwnProfile ? "My Questions" : "Questions"}
          value={stat(questionsCount)}
          hint={isOwnProfile ? "Created by you" : "Created"}
        />
        <StatCard
          icon={FolderOpen}
          label={isOwnProfile ? "My Quizzes" : "Quizzes"}
          value={stat(quizzesCount)}
          hint={isOwnProfile ? "Created by you" : "Created"}
        />
        <StatCard
          icon={Gamepad2}
          label="Quizzes Played"
          value="—"
          hint="Coming soon"
        />
        <StatCard
          icon={Trophy}
          label="Avg. Score"
          value="—"
          hint="Coming soon"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details */}
        <Card className="lg:col-span-1 border dark:border-foreground/30 bg-background">
          <CardHeader>
            <CardTitle className="text-lg">
              {isOwnProfile ? "Account" : "About"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Username" value={username} />
            {isOwnProfile && email && <DetailRow label="Email" value={email} />}
            {dateRegistered && (
              <DetailRow
                label="Member since"
                value={formatDate(dateRegistered)}
              />
            )}
            {isOwnProfile && lastLogin && (
              <DetailRow label="Last login" value={formatDate(lastLogin)} />
            )}

            {isOwnProfile && (
              <div className="pt-3 flex flex-col gap-2">
                <Link to="/my-dashboard/settings">
                  <Button className="w-full text-white">
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <button
                  disabled
                  className="w-full rounded-lg border border-foreground/20 py-2 px-4 text-sm text-muted-foreground opacity-70 cursor-not-allowed"
                >
                  Change password (soon)
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity placeholder */}
        <Card className="lg:col-span-2 border dark:border-foreground/30 bg-background">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
              <Activity className="h-8 w-8 mb-3 opacity-50" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm">
                Recent quizzes and questions will appear here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Achievements placeholder */}
        <Card className="lg:col-span-3 border dark:border-foreground/30 bg-background">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border border-dashed border-foreground/20 flex items-center justify-center text-muted-foreground/60"
                >
                  <Lock className="h-5 w-5" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Earn badges by creating and playing quizzes. Coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
