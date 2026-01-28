import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ClienteForm } from "@/components/forms/cliente-form";

export default function NovoClientePage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/clientes" },
          { label: "Novo Cliente" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Novo Cliente</h1>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar um novo cliente
        </p>
      </div>

      <ClienteForm />
    </div>
  );
}
