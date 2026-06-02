import { Outlet } from "react-router-dom";

function AdminSidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white">
      <div className="px-5 py-4 text-sm font-semibold text-slate-700">Admin</div>
    </aside>
  );
}

function AdminTopbar() {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 flex items-center">
      Dashboard
    </header>
  );
}

export default function AdminLayout() {
  return (
    <div className="min-h-dvh bg-[var(--color-surface-2)]">
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex-1">
          <AdminTopbar />
          <div className="mx-auto max-w-7xl px-6 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
