# Referência — API eNotas Emissor (integração NF-e)

> Levantado em 16/11/2026 a partir da documentação interna do painel (app.enotas.com.br/swagger, exige login).
> A conta da Mr. Chrono é do **eNotas Emissor** (plano com API). NÃO é o "Nota Gateway" (api.notagateway.com.br), que é outro produto.

## Acesso

- Base URL: `https://app.enotas.com.br/api`
- Auth: header `Authorization: Basic {API_KEY}` (a chave vem do painel: Ajuda → API e Integração)
- JSON (`Content-Type: application/json`)
- **Não há ambiente de homologação** documentado nessa API.
- **Não há webhooks** disponíveis no painel do Emissor (o menu "Gerenciar > Webhooks" citado no painel não existe na conta) → acompanhar status por consulta (polling).

## Endpoints relevantes

| Método | Caminho | Uso |
|---|---|---|
| POST | `/vendas` | Criar (ou atualizar, enviando `id`) venda → retorna `{ vendaId }` (uuid do eNotas) |
| GET | `/vendas/{vendaId}` | Consultar venda: `situacao`, `nfe.situacao`, `nfe.id`, `nfe.motivoSituacao` |
| GET | `/vendas/getFilterBy?pageNumber=0&pageSize=50&filter=...` | Listar/filtrar vendas (OData-like) |
| POST | `/vendas/{vendaId}/cancelar` | Cancela venda e nota. NF-e: prazo 24h; fora do prazo o eNotas emite **NF-e de Devolução automática** (se habilitado na empresa) |
| POST | `/vendas/emitirNFe` | `{ vendasIds: [...], dataCompetencia?, enviarNFeCliente? }` — força envio para emissão |
| POST | `/vendas/enviarnfeporemail` | `{ vendaID, nfeID }` |
| POST | `/clientes`, GET `/clientes/{id}` | Cliente (criado automaticamente junto com a venda) |
| POST | `/produtos`, `/produtos/{id}/configurarNFeProduto` | Produto e configuração fiscal |

## VendaRequest (campos usados)

```json
{
  "idExterno": "<id da venda no sistema Mr. Chrono (+ sufixo da parte)>",
  "data": "dd/MM/yyyy",
  "cliente": {
    "cpfCnpj": "...", "nome": "...", "email": "...", "telefone": "...",
    "endereco": { "pais": "Brasil", "uf": "SP", "cidade": "...", "logradouro": "...",
                  "numero": "...", "complemento": null, "bairro": "...", "cep": "..." }
  },
  "produto": { "nome": "Marca Modelo", "idExterno": "SKU", "valorTotal": 0 },
  "valorTotal": 0,
  "valorTotalNFe": 0,
  "quandoEmitirNFe": 0,
  "enviarNFeCliente": false,
  "meioPagamento": 9
}
```

Enums:
- `quandoEmitirNFe`: 0=Na venda, 1=Após garantia, 2=Não emitir, 3=Em aberto
- `meioPagamento`: 0=Não informado, 1=Boleto, 2=Cartão de Crédito, 3=Depósito, 4=Transferência, 7=Outro, 8=Débito, 9=Pix
- `tipoNFe` (produto): 0=NFS-e, 1=NF-e, 2=Split, 3=Indefinido
- `situacao` da venda (extraído do JS do painel, `ENotas.Constants.situacaoVenda`): 0=EmAberto, 1=Vencida, 2=EmGarantia, 3=Completa, 4=Reembolsada, 5=Cancelada
- `nfe.situacao` (`ENotas.Constants.situacaoNFe`): 0=Pendente, 1=EmProcessoDeEmissao, 2=Emitida, 3=FalhaAoEmitir, 4=EmProcessoDeCancelamento, 5=Cancelada, 6=FalhaAoCancelar, 7=NaoEmitir, 8=EnviadoPorEmail, 9=EmitidaParcialmente, 10=CanceladaParcialmente
- `tipoNFe` da nota (painel): 0=Serviço, 1=Produto, 2=Split, 3=Indefinido, 4=Devolução

## PDF / XML

- O link do PDF vem em `nfe.prefeitura.linkImpressao` (o painel usa esse campo), no formato `https://gw-api.enotas.com.br/file/{...}/{...}/{...}/pdf`. Também há `nfe.prefeitura.numero` e `nfe.prefeitura.dataEmissao`.
- O XML é derivado trocando o final `/pdf` por `/xml`. **A confirmar no primeiro teste real.**

## Nota de devolução (automática)

Configuração no painel (com o contador):
1. Empresa → Alterar cadastro → Dados municipais → ativar **"Emitir a NF-e de Devolução automaticamente"**.
2. Aba **Configurações fiscais de vendas** → preencher os dados da nota de devolução.
3. Em Gerenciar → Produtos (e no "Produto padrão") → Configurações fiscais de vendas → dados de devolução.

Disparada quando a SEFAZ rejeita o cancelamento com código 220 ou 501. Só para cliente PF ou PJ não contribuinte.
