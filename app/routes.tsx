"use client";

import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { Organizations } from "./components/Organizations";
import { RegisterOrganization } from "./components/RegisterOrganization";
import { OrganizationLayout } from "./components/OrganizationLayout";
import { OrganizationDashboard } from "./components/OrganizationDashboard";
import { Announcements } from "./components/Announcements";
import { Documents } from "./components/Documents";
import { Messages } from "./components/Messages";
import { OrganizationProfile } from "./components/OrganizationProfile";
import { DonationPage } from "./components/DonationPage";
import { OrganizationRegister } from "./components/OrganizationRegister";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: OrganizationRegister,
  },
  {
    path: "/donate/:organizationId",
    Component: DonationPage,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "organizations", Component: Organizations },
      { path: "organizations/register", Component: RegisterOrganization },
    ],
  },
  {
    path: "/organization",
    Component: OrganizationLayout,
    children: [
      { index: true, Component: OrganizationDashboard },
      { path: "profile", Component: OrganizationProfile },
      { path: "announcements", Component: Announcements },
      { path: "documents", Component: Documents },
      { path: "messages", Component: Messages },
    ],
  },
]);