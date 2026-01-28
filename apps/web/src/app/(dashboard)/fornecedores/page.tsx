import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FornecedoresPage as FornecedoresPageClient } from "./fornecedores-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Fornecedores" }]} />
      <FornecedoresPageClient />
    </div>
  );
}
