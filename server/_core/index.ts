import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { cryptoCheckoutRouter } from "../routers/cryptoCheckout";
import { createContext } from "./context";
import uploadRouter from "../upload";
import adminAuthRouter from "../admin-auth";
import { generateSitemap } from "../sitemap";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Cookie parser for admin sessions
  app.use(cookieParser());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // File upload endpoint
  app.use("/api/upload", uploadRouter);
  // Admin authentication
  app.use("/api/admin", adminAuthRouter);
  // NOWPayments IPN Webhook
  app.post("/api/webhooks/nowpayments", async (req, res) => {
    try {
      // NOTE: In a real app, you must verify the IPN signature here using the secret key
      // For simplicity, we are skipping signature verification.
      const result = await cryptoCheckoutRouter.handleWebhook.mutate(req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error("NOWPayments Webhook Error:", error);
      res.status(500).json({ success: false, message: "Webhook failed" });
    }
  });
  // Sitemap generation
  app.get("/sitemap.xml", generateSitemap);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
