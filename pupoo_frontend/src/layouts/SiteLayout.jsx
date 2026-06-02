import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SiteHeader from "../pages/site/components/SiteHeader";
import SiteFooter from "../pages/site/components/SiteFooter";

const SiteChatBot = lazy(() => import("../pages/site/components/SiteChatBot"));

export default function SiteLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const hideChat = location.pathname === "/credits";

  return (
    <div className="min-h-screen flex flex-col">
      {/* 관리자센터에서는 Header 제거 */}
      {!isAdminPage && <SiteHeader />}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* 관리자센터에서는 Footer도 제거 */}
      {!isAdminPage && <SiteFooter />}

      {/* 유저용 챗봇 (관리자, 크레딧 제외) */}
      {!isAdminPage && !hideChat && (
        <Suspense fallback={null}>
          <SiteChatBot />
        </Suspense>
      )}
    </div>
  );
}
