import { config } from "dotenv";
import path from "path";
let envFile = '.env.development';

if (process.env.NODE_ENV === "production") {
    envFile = ".env";
}

config({ path: path.resolve(process.cwd(), envFile) });

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { log, setupVite, serveStatic } from "./vite";

// Augment express-session with custom SessionData
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
      sameSite: process.env.NODE_ENV === "production" ? "strict": "lax",
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Dynamic import: routes.ts triggers db.ts which reads DATABASE_URL at module
  // load time. It must be imported after dotenv.config() has run above.
  const { registerRoutes } = await import("./routes");
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configurable host and port via environment variables
  if (!process.env.PORT) {
    throw new Error("PORT environment variable is required");
  }
  if (!process.env.HOST) {
    throw new Error("HOST environment variable is required");
  }

  const port = parseInt(process.env.PORT, 10);
  const host = process.env.HOST;

  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
