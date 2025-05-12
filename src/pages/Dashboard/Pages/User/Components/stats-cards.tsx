import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/utils/cn";
// import { useTotalUsersData } from "../api/get-total-users";
// import { Spinner } from "@/components/ui";

interface StatsCardsProps {
  className?: string;
}

export function StatsCards({ className }: StatsCardsProps) {
  // const { data, isLoading, isError } = useTotalUsersData({});

  // if (isLoading) {
  //   return (
  //     <div className="flex h-48 w-full items-center justify-center">
  //       <Spinner size="lg" />
  //     </div>
  //   );
  // }

  // if (isError) {
  //   return (
  //     <div className="flex h-48 w-full items-center justify-center">
  //       <p className="text-red-500">
  //         Failed to load users. Please try again later.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <Card className="bg-background border-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {/* <div className="text-2xl font-bold">{data}</div> */}
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-semibold">+2.5%</span> from last
            month
          </p>
        </CardContent>
      </Card>
      <Card className="bg-background border-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Today</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2,345</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-semibold">+180</span> from
            yesterday
          </p>
        </CardContent>
      </Card>
      <Card className="bg-background border-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">573</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-semibold">+201</span> from last
            month
          </p>
        </CardContent>
      </Card>
      <Card className="bg-background border-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg. Session Time
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24m 13s</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-semibold">+1m 12s</span> from
            last week
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
