import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EstoquePage as EstoquePageClient } from "./estoque-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params?.tab === "previsao" ? "previsao" : "estoque";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Estoque" }]} />
      <EstoquePageClient initialTab={initialTab} />
    </div>
  );
}
