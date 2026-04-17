import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  // Allow the dev domain
  if (process.env.REPLIT_DEV_DOMAIN && origin === `https://${process.env.REPLIT_DEV_DOMAIN}`) return true;
  // Allow any replit.app deployment domain
  if (origin.endsWith(".replit.app")) return true;
  // Allow REPLIT_DOMAINS list (comma-separated) if set
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",").map((d) => d.trim());
    if (domains.some((d) => origin === `https://${d}` || origin === `http://${d}`)) return true;
  }
  return false;
}

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
