import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function FornecedoresPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Fornecedores" }]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <p className="text-muted-foreground">
          Gerenciamento de fornecedores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Fornecedores</CardTitle>
          <CardDescription>
            Todos os fornecedores cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Módulo em desenvolvimento. Em breve você poderá cadastrar e gerenciar fornecedores aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
