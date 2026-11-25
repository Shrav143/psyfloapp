import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui";
import { AskPanel, NotificationsPanel } from "./Panels";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Shell() {
  const { pathname } = useLocation();
  // Each route starts at the top of the page.
  useEffect(() => {
    document.getElementById("psy-main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="psy-main" className="mx-auto w-full max-w-[1560px] px-7 pt-[26px] pb-14">
          <Outlet />
        </main>
      </div>
      <AskPanel />
      <NotificationsPanel />
      <Toaster />
    </div>
  );
}
