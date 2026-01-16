import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    // Add custom domain
    origins.add("https://riannahscloset.com");
    origins.add("https://www.riannahscloset.com");

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  
  const iosAppStoreUrl = process.env.IOS_APP_STORE_URL || "IOS_APP_STORE_URL_PLACEHOLDER";
  const androidPlayStoreUrl = process.env.ANDROID_PLAY_STORE_URL || "ANDROID_PLAY_STORE_URL_PLACEHOLDER";

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/IOS_APP_STORE_URL_PLACEHOLDER/g, iosAppStoreUrl)
    .replace(/ANDROID_PLAY_STORE_URL_PLACEHOLDER/g, androidPlayStoreUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function serveSupportPage(res: Response, supportPageTemplate: string, appName: string) {
  const html = supportPageTemplate.replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function servePrivacyPage(res: Response, privacyPageTemplate: string, appName: string) {
  const html = privacyPageTemplate.replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function isMobileUserAgent(ua: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const supportTemplatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "support-page.html",
  );
  const privacyTemplatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "privacy-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const supportPageTemplate = fs.readFileSync(supportTemplatePath, "utf-8");
  const privacyPageTemplate = fs.readFileSync(privacyTemplatePath, "utf-8");
  const appName = getAppName();
  const webDistPath = path.resolve(process.cwd(), "dist");
  const hasWebBuild = fs.existsSync(path.join(webDistPath, "index.html"));

  log("Serving static Expo files with dynamic manifest routing");
  if (hasWebBuild) {
    log("Web build detected at dist/ - will serve to desktop browsers");
  }

  // Support page route
  app.get("/support", (_req: Request, res: Response) => {
    serveSupportPage(res, supportPageTemplate, appName);
  });

  // Privacy policy page route
  app.get("/privacy", (_req: Request, res: Response) => {
    servePrivacyPage(res, privacyPageTemplate, appName);
  });

  // In development, proxy Metro bundler requests through Express
  // This allows mobile devices to access everything through port 80 (via Express on 8081)
  if (process.env.NODE_ENV === "development") {
    const metroPort = process.env.METRO_PORT || "19000";
    const metroProxy = createProxyMiddleware({
      target: `http://localhost:${metroPort}`,
      changeOrigin: true,
      ws: true,
      logger: console,
    });
    log(`Proxying Metro bundler requests to port ${metroPort}`);

    // Proxy specific Metro bundler paths
    app.use("/node_modules", metroProxy);
    app.use("/debugger-ui", metroProxy);
    app.use("/.expo", metroProxy);
    app.use("/logs", metroProxy);
    app.use("/inspector", metroProxy);
    app.use("/symbolicate", metroProxy);
    app.use("/message", metroProxy);
    app.use("/status", metroProxy);
    
    // Proxy JS bundle requests
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.endsWith(".bundle") || req.path.endsWith(".map") || req.path.includes("/hot")) {
        return metroProxy(req, res, next);
      }
      next();
    });

    log("Development mode: Proxying Metro bundler requests through Express");
  }

  // Serve web app static files for desktop browsers
  if (hasWebBuild) {
    app.use("/_expo", express.static(path.join(webDistPath, "_expo")));
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      // Serve web app directly for all browsers (desktop and mobile)
      if (hasWebBuild) {
        return res.sendFile(path.join(webDistPath, "index.html"));
      }
      
      // Fallback to landing page only if no web build exists
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  // Serve .well-known directory for Apple App Site Association
  app.use("/.well-known", express.static(
    path.resolve(process.cwd(), "server", "public", ".well-known"),
    {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("apple-app-site-association")) {
          res.setHeader("Content-Type", "application/json");
        }
      }
    }
  ));

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
  
  // Also serve web build assets as fallback
  if (hasWebBuild) {
    app.use(express.static(webDistPath));
  }

  // SPA catch-all for client-side routing (deep links like /outfits, /calendar, etc.)
  if (hasWebBuild) {
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return next();
      }
      
      // Serve SPA for all browsers (desktop and mobile web)
      return res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

function setupDomainRedirect(app: express.Application) {
  // Only redirect in production
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const customDomain = "riannahscloset.com";

  app.use((req, res, next) => {
    const host = req.header("x-forwarded-host") || req.get("host") || "";
    
    // Redirect replit.app domains to custom domain
    if (host.endsWith(".replit.app") || host.endsWith(".repl.co")) {
      const protocol = req.header("x-forwarded-proto") || "https";
      const redirectUrl = `${protocol}://${customDomain}${req.originalUrl}`;
      return res.redirect(301, redirectUrl);
    }
    
    next();
  });

  log(`Domain redirect enabled: *.replit.app -> ${customDomain}`);
}

(async () => {
  setupDomainRedirect(app);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  // Register API routes BEFORE static file serving and SPA catch-all
  const server = await registerRoutes(app);

  // Static files and SPA catch-all come after API routes
  configureExpoAndLanding(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
