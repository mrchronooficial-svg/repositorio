import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EstoquePage as EstoquePageClient } from "./estoque-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Estoque" }]} />
      <EstoquePageClient />
    </div>
  );
}
