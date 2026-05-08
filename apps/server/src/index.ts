import "dotenv/config";
import { createContext } from "@hhuacm-dashboard/api/context";
import { appRouter } from "@hhuacm-dashboard/api/routers/index";
import { auth } from "@hhuacm-dashboard/auth";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3001";

app.use(logger());
app.use(
  "/*",
  cors({
    origin: corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: ({ req }) => createContext({ headers: req.headers }),
  })
);

app.get("/", (c) => c.text("OK"));

export default app;
