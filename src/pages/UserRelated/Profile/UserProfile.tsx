import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui";
import { usePublicProfile } from "./api/get-public-profile";
import { ProfileView } from "./ProfileView";

/**
 * "Public" container: renders another user's public profile by id.
 * Counts are omitted for now (no public-by-id count endpoint yet), so the
 * stat cards show "—". Route: /users/:userId — not yet linked from the UI.
 */
export const UserProfile = () => {
  const { userId } = useParams();
  const { data, isLoading, isError } = usePublicProfile(userId ?? "");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-center text-muted-foreground py-16">
        This profile could not be found.
      </p>
    );
  }

  return (
    <div className="pt-20">
      <ProfileView
        isOwnProfile={false}
        username={data.username}
        profileImageUrl={data.profileImageUrl}
        roles={data.roles}
        dateRegistered={data.dateRegistered}
      />
    </div>
  );
};
