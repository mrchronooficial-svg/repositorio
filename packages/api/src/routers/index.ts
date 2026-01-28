import { protectedProcedure, publicProcedure, router } from "../index";
import { fornecedorRouter } from "./fornecedor";
import { pecaRouter } from "./peca";
import { clienteRouter } from "./cliente";
import { vendaRouter } from "./venda";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  fornecedor: fornecedorRouter,
  peca: pecaRouter,
  cliente: clienteRouter,
  venda: vendaRouter,
});
export type AppRouter = typeof appRouter;
