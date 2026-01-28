import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ClientesPage as ClientesPageClient } from "./clientes-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes" }]} />
      <ClientesPageClient />
    </div>
  );
}
