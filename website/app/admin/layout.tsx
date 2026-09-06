// TODO: wrap with auth check (super_admin / support role gate) + sidebar nav
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper-off)]">
      {/* TODO: <AdminSidebar /> */}
      <main>{children}</main>
    </div>
  );
}
