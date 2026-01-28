import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { VendasPage as VendasPageClient } from "./vendas-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Vendas" }]} />
      <VendasPageClient />
    </div>
  );
}
