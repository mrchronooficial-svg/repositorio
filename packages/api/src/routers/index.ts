import { protectedProcedure, publicProcedure, router } from "../index";
import { fornecedorRouter } from "./fornecedor";

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
});
export type AppRouter = typeof appRouter;
