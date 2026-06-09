import { HomeLayout } from "@/layouts/layout";
import MyProfile from "./MyProfile";

// Standalone /my-profile route. pt-20 clears the overlay header.
export const ProfileWrapper = () => {
  return (
    <HomeLayout
      children={
        <div className="pt-20 bg-muted h-full">
          <MyProfile />
        </div>
      }
    />
  );
};
