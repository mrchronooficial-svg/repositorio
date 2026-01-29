import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DashboardPage as DashboardPageClient } from "./dashboard-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <DashboardPageClient />
    </div>
  );
}
