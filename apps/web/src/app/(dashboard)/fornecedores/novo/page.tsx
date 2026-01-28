import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FornecedorForm } from "@/components/forms/fornecedor-form";

export default function NovoFornecedorPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Fornecedores", href: "/fornecedores" },
          { label: "Novo Fornecedor" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Novo Fornecedor</h1>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar um novo fornecedor
        </p>
      </div>

      <FornecedorForm />
    </div>
  );
}
