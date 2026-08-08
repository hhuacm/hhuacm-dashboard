import { createContext } from "@hhuacm-dashboard/api/context";
import { appRouter } from "@hhuacm-dashboard/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (request: Request) =>
  fetchRequestHandler({
    createContext: ({ req }) => createContext({ headers: req.headers }),
    endpoint: "/trpc",
    req: request,
    router: appRouter,
  });

export { handler as GET, handler as POST };
