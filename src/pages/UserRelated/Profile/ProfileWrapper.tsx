import { HomeLayout } from "@/layouts/layout";
import MyProfile from "./MyProfile";
export const ProfileWrapper = () => {
  return <HomeLayout children={<MyProfile />} />;
};
