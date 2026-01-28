import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { VendaForm } from "@/components/forms/venda-form";

export default function NovaVendaPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Vendas", href: "/vendas" },
          { label: "Nova Venda" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nova Venda</h1>
        <p className="text-muted-foreground">
          Registre uma nova venda selecionando a peca e o cliente
        </p>
      </div>

      <VendaForm />
    </div>
  );
}
