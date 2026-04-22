import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LeadsPage as LeadsPageClient } from "./leads-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Leads" }]} />
      <LeadsPageClient />
    </div>
  );
}
