import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function EstoquePage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Estoque" }]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <p className="text-muted-foreground">
          Gerenciamento de peças e relógios
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Peças</CardTitle>
          <CardDescription>
            Todas as peças cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Módulo em desenvolvimento. Em breve você poderá cadastrar e gerenciar peças aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
