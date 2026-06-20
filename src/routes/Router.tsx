import { lazy, useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { adminAuthLoader, permissionAuthLoader, userAuthLoader } from "../lib/Auth";
import {
  adminDashboardNavButtons,
  userDashboardNavButtons,
} from "@/pages/Dashboard/Components/dashboardNavConfig";
// import { AppRoot } from "../pages/AppRoot";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

import { RedirectIfLoggedIn } from "../lib/Redirect";
import "../global.css";
import { Navigate } from "react-router-dom";
// import { HomeLayout } from "@/layouts/layout";
// import QuizCreator from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz";
//import  {QuizSelection} from "@/pages/Quiz/Quiz-Selection";
// import { QuizQuestionProvider } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/Quiz-questions-context";
// import { DashboardErrorElement } from "@/pages/UtilityPages/Error/Dashboard-Error-Element";
import { quizLoader } from "@/loaders/quiz.loader";
import { dashboardEntryLoader } from "@/loaders/dashboardEntryLoader";
import { quizSelectionLoader } from "@/loaders/quiz-selection.loader";
import { MultiplayerLobbyPage } from "@/pages/Quiz/Multiplayer/MultiplayerLobbyPage";
import { CreateLobby } from "@/pages/Quiz/Multiplayer/components/create-lobby";
const HomeLayout = lazy(() => {
  console.log("Loading HomeLayout chunk...");
  return import("@/layouts/layout").then((module) => ({
    default: module.HomeLayout,
  }));
});
const AppRoot = lazy(() =>
  import("../pages/AppRoot").then((module) => ({ default: module.AppRoot }))
);
const QuizSelection = lazy(() =>
  import("@/pages/Quiz/Quiz-Selection").then((module) => ({
    default: module.QuizSelection,
  }))
);
const GameModeSelection = lazy(() =>
  import("@/pages/Quiz/Game-Mode-Selection").then((module) => ({
    default: module.GameModeSelection,
  }))
);
const MultiplayerMenu = lazy(() =>
  import("@/pages/Quiz/Multiplayer/Multiplayer-Menu").then((module) => ({
    default: module.MultiplayerMenu,
  }))
);
const QuizPageRouteWrapper = lazy(() =>
  import(
    "@/pages/Quiz/Sessions/components/quiz-taking-process/quiz-page-route-wrapper"
  ).then((module) => ({ default: module.QuizPageRouteWrapper }))
);
const QuizResultsRouteWrapper = lazy(() =>
  import(
    "@/pages/Quiz/Sessions/components/quiz-results/quiz-results-route-wrapper"
  ).then((module) => ({ default: module.QuizResultsRouteWrapper }))
);
const QuizCreator = lazy(
  () =>
    import(
      "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/create-quiz"
    )
);
const DashboardErrorElement = lazy(() =>
  import("@/pages/UtilityPages/Error/Dashboard-Error-Element").then(
    (module) => ({ default: module.DashboardErrorElement })
  )
);
const QuizQuestionProvider = lazy(() =>
  import(
    "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/Quiz-questions-context"
  ).then((module) => ({ default: module.QuizQuestionProvider }))
);

enum HeaderBehavior {
  DEFAULT = "default",
  OVERLAY_TRANSPARENT = "overlay-transparent",
  OVERLAY_SOLID = "overlay-solid",
}
// Lazy load components
const Home = lazy(() =>
  import("../pages/Home/Home").then((module) => ({ default: module.Home }))
);
const AboutUs = lazy(() =>
  import("../pages/AboutUs/AboutUs").then((module) => ({
    default: module.AboutUs,
  }))
);
const Login = lazy(() => import("../pages/UserRelated/Login/Login"));
const Signup = lazy(() => import("../pages/UserRelated/Signup/Signup"));
const ConfirmEmail = lazy(() => import("@/pages/UserRelated/ConfirmEmail/ConfirmEmail"));
const AccessDeniedPage = lazy(() =>
  import("../pages/UtilityPages/AccessDenied").then((module) => ({
    default: module.AccessDeniedPage,
  }))
);
// Public profile of another user. Route is scaffolded but not yet linked from
// the UI (see UsersController.GetPublicProfile, also marked not-yet-used).
const UserProfile = lazy(() =>
  import("../pages/UserRelated/Profile/UserProfile").then((module) => ({
    default: module.UserProfile,
  }))
);
const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.OVERLAY_SOLID}
            effect="squares"
            children={<Home />}
          />
        </>
      ),
    },
    {
      path: "/about-us",
      element: (
        <>
          <HomeLayout children={<AboutUs />} lightning={true} />
        </>
      ),
    },


    {
      path: "/choose-mode",
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.DEFAULT}
            children={<GameModeSelection />}
          />
        </>
      ),
    },
    {
      path: "/multiplayer-menu",
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.DEFAULT}
            children={<MultiplayerMenu />}
          />
        </>
      ),
    },
    {
      path: "/choose-quiz",
      loader: quizSelectionLoader(queryClient),
      errorElement: <DashboardErrorElement />,
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.DEFAULT}
            children={<QuizSelection />}
          />
        </>
      ),
    },
    {
      path: "/multiplayer/create",
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <CreateLobby />
        </>
      ),
    },
    {
      path: "/multiplayer/join",
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.DEFAULT}
            effect="none"
            children={<MultiplayerLobbyPage />}
          />
        </>
      ),
    },
    {
      path: "/multiplayer/lobby/:sessionId",
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout
            headerBehavior={HeaderBehavior.DEFAULT}
            effect="none"
            children={<MultiplayerLobbyPage />}
          />
        </>
      ),
    },
    {
      path: "/quiz/:quizId/play",
      errorElement: <DashboardErrorElement />,
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout
            children={<QuizPageRouteWrapper />}
            headerBehavior={HeaderBehavior.DEFAULT}
          />
        </>
      ),
    },
    {
      path: "/quiz/results/:sessionId",
      errorElement: <DashboardErrorElement />,
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout
            children={<QuizResultsRouteWrapper />}
            headerBehavior={HeaderBehavior.OVERLAY_SOLID}
          />
        </>
      ),
    },
    {
      path: "/quiz/results/:sessionId/review",
      errorElement: <DashboardErrorElement />,
      loader: userAuthLoader(queryClient),
      element: (
        <>
          <HomeLayout
            children={<QuizResultsRouteWrapper />}
            headerBehavior={HeaderBehavior.OVERLAY_SOLID}
          />
        </>
      ),
    },
    {
      path: "/signup",
      element: <RedirectIfLoggedIn component={<Signup />} />,
    },
    {
      // Public: the email-confirmation link is opened from the inbox, possibly while logged out.
      path: "/confirm-email",
      element: (
        <HomeLayout headerBehavior={HeaderBehavior.DEFAULT}>
          <ConfirmEmail />
        </HomeLayout>
      ),
    },
    {
      path: "/login",
      element: <RedirectIfLoggedIn component={<Login />} />,
    },
    {
      path: "/access-denied",
      element: <AccessDeniedPage />,
    },
    {
      path: "/go/dashboard",
      loader: dashboardEntryLoader(queryClient),
      errorElement: <DashboardErrorElement />,
    },
    {
  path: "/dashboard/*",
  element: (
    <AppRoot
      basePath="/dashboard"
      navItems={adminDashboardNavButtons}
      fullWidthPaths={["/dashboard/quizzes/create-quiz"]}
    />
  ),
  id: "dashboardRoot",
  loader: adminAuthLoader(queryClient),   // was userAuthLoader — admins only
  errorElement: <DashboardErrorElement />,
  children: [
        {
          index: true,
          element: <Navigate to="/dashboard/questions" replace />,
        },
        {
          path: "application",
          lazy: async () => {
            const { Application } = await import(
              "../pages/Dashboard/Pages/Application/Application"
            );
            return { Component: Application };
          },
        },
        {
          path: "questions",
          lazy: async () => {
            const { Questions } = await import(
              "../pages/Dashboard/Pages/Question/Questions"
            );
            return { Component: Questions };
          },
        },
        // {
        //   path: "questions/:questionId",
        //   lazy: async () => {
        //     const { QuestionRoute } = await import(
        //       "../pages/Dashboard/Pages/Question/Question"
        //     );
        //     return { Component: QuestionRoute };
        //   },
        //   loader: async (args: LoaderFunctionArgs) => {
        //     const { questionLoader } = await import(
        //       "../pages/Dashboard/Pages/Question/Question"
        //     );
        //     return questionLoader(queryClient)(args);
        //   },
        // },
        {
          path: "quizzes",
          lazy: async () => {
            const { Quizzes } = await import(
              "../pages/Dashboard/Pages/Quiz/Quizzes"
            );
            return { Component: Quizzes };
          },
        },
        {
          path: "quizzes/create-quiz",
          element: (
            <QuizQuestionProvider>
              <QuizCreator />
            </QuizQuestionProvider>
          ),
        },
        {
          path: "quiz/:quizId",
          lazy: async () => {
            const { QuizRoute } = await import(
              "../pages/Dashboard/Pages/Quiz/Quiz"
            );
            return { Component: QuizRoute };
          },
          loader: quizLoader(queryClient),
        },
        {
          path: "permissions",
          lazy: async () => {
            const { Permissions } = await import(
              "../pages/Dashboard/Pages/Permissions/Permissions"
            );
            return { Component: Permissions };
          },
        },
        {
          path: "audit-logs",
          lazy: async () => {
            const { AuditLog } = await import(
              "../pages/Dashboard/Pages/AuditLog/AuditLog"
            );
            return { Component: AuditLog };
          },
        },
       {
        path: "users",
        lazy: async () => {
          const { Users } = await import("../pages/Dashboard/Pages/User/Users");
          return { Component: Users };
        },
        loader: async (args) => {
          const auth = await permissionAuthLoader(queryClient, ["user:view"])(args);
          if (auth instanceof Response) return auth; // redirect — stop here
          const { usersLoader } = await import("../loaders/users.loader");
          return usersLoader(queryClient)(); // ← note the extra ()
        },
      },
        {
          path: "*",
          lazy: async () => {
            const { NotFoundRoute } = await import(
              "../pages/UtilityPages/NotFound/Not-Found"
            );
            return { Component: NotFoundRoute };
          },
        },
      ],
    },
    {
      path: "/my-dashboard",
      id: "myDashboardRoot",
      errorElement: <DashboardErrorElement />,
      loader: userAuthLoader(queryClient),
      element: (
        <AppRoot
          basePath="/my-dashboard"
          navItems={userDashboardNavButtons}
          fullWidthPaths={["/my-dashboard/quizzes/create"]}
        />
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/my-dashboard/profile" replace />,
        },
        {
          path: "profile",
          lazy: async () => {
            const { MyProfile } = await import(
              "../pages/UserDashboard/MyProfile"
            );
            return { Component: MyProfile };
          },
        },
        {
          path: "questions",
          lazy: async () => {
            const { MyQuestions } = await import(
              "../pages/UserDashboard/MyQuestions"
            );
            return { Component: MyQuestions };
          },
        },
        {
          path: "quizzes",
          lazy: async () => {
            const { MyQuizzes } = await import(
              "../pages/UserDashboard/MyQuizzes"
            );
            return { Component: MyQuizzes };
          },
        },
        {
          path: "reports",
          lazy: async () => {
            const { MyReports } = await import(
              "../pages/UserDashboard/MyReports"
            );
            return { Component: MyReports };
          },
        },
        {
          path: "quizzes/create",
          element: (
            <QuizQuestionProvider>
              <QuizCreator />
            </QuizQuestionProvider>
          ),
        },
        {
          path: "settings",
          lazy: async () => {
            const { Settings } = await import(
              "../pages/UserRelated/SettingsPage/Settings"
            );
            return { Component: Settings };
          },
        },
        {
          path: "*",
          lazy: async () => {
            const { NotFoundRoute } = await import(
              "../pages/UtilityPages/NotFound/Not-Found"
            );
            return { Component: NotFoundRoute };
          },
        },
      ],
    },
    {
      path: "my-profile",
      lazy: async () => {
        const { ProfileWrapper } = await import(
          "../pages/UserRelated/Profile/ProfileWrapper"
        );
        return { Component: ProfileWrapper };
      },
    },
    {
      // Scaffolded public profile — not linked from anywhere in the UI yet.
      path: "/users/:userId",
      element: (
        <HomeLayout
          headerBehavior={HeaderBehavior.DEFAULT}
          children={<UserProfile />}
        />
      ),
    },
    {
      path: "*",
      lazy: async () => {
        const { NotFoundRoute } = await import(
          "../pages/UtilityPages/NotFound/Not-Found"
        );
        return { Component: NotFoundRoute };
      },
    },
  ]);

export function AppRouter() {
  const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return <RouterProvider router={router} />;
}
