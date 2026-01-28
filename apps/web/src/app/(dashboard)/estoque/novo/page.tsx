import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PecaForm } from "@/components/forms/peca-form";

export default function NovaPecaPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Estoque", href: "/estoque" },
          { label: "Nova Peca" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nova Peca</h1>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar uma nova peca no estoque
        </p>
      </div>

      <PecaForm />
    </div>
  );
}
