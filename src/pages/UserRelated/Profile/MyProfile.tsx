import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/Auth";
import { User } from "@/types/user-types";
import { getMyQuestionsTotalQueryOptions } from "@/pages/UserDashboard/api/get-my-questions";
import { useMyQuizzesData } from "@/pages/UserDashboard/api/get-my-quizzes";
import { ProfileView } from "./ProfileView";

// "Self" container: fetches the signed-in user's own data (self-scoped endpoints)
// and renders the shared ProfileView with isOwnProfile.
export const MyProfile = () => {
  const userQuery = useUser();
  const questionsTotalQuery = useQuery(getMyQuestionsTotalQueryOptions());
  const quizzesQuery = useMyQuizzesData({ params: { pageSize: 1 } });

  if (!userQuery?.data) return null;
  const user: User = userQuery.data;

  return (
    <ProfileView
      isOwnProfile
      username={user.username}
      email={user.email}
      profileImageUrl={user.profileImageUrl}
      roles={user.roles}
      dateRegistered={user.dateRegistered}
      lastLogin={user.lastLogin}
      questionsCount={questionsTotalQuery.data ?? 0}
      quizzesCount={quizzesQuery.data?.pagination?.totalItems ?? 0}
    />
  );
};

export default MyProfile;
