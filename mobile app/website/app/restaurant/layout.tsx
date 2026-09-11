// TODO: wrap with auth check (restaurant role) + sidebar nav
export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper-off)]">
      {/* TODO: <RestaurantSidebar /> */}
      <main>{children}</main>
    </div>
  );
}
