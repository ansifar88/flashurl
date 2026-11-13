#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Configuring FlashURL monorepo..."

# --------------------------------------------------
# 1. Root npm workspace
# --------------------------------------------------

cat > package.json <<'EOF'
{
  "name": "flashurl",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/analytics-service",
    "apps/redirect-service",
    "apps/url-service",
    "apps/user-service",
    "packages/*"
  ],
  "scripts": {
    "dev:url": "npm run dev --workspace=@flashurl/url-service",
    "dev:redirect": "npm run dev --workspace=@flashurl/redirect-service",
    "dev:user": "npm run dev --workspace=@flashurl/user-service",
    "dev:analytics": "npm run dev --workspace=@flashurl/analytics-service",

    "build:url": "npm run build --workspace=@flashurl/url-service",
    "build:redirect": "npm run build --workspace=@flashurl/redirect-service",
    "build:user": "npm run build --workspace=@flashurl/user-service",
    "build:analytics": "npm run build --workspace=@flashurl/analytics-service",

    "typecheck:url": "npm run typecheck --workspace=@flashurl/url-service",
    "typecheck:redirect": "npm run typecheck --workspace=@flashurl/redirect-service",
    "typecheck:user": "npm run typecheck --workspace=@flashurl/user-service",
    "typecheck:analytics": "npm run typecheck --workspace=@flashurl/analytics-service",

    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
EOF

# --------------------------------------------------
# 2. Shared TypeScript configuration
# --------------------------------------------------

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "sourceMap": true
  }
}
EOF

# --------------------------------------------------
# 3. Shared package manifests
# --------------------------------------------------

for package in \
  config \
  contracts \
  eslint-config \
  logger \
  observability \
  typescript-config
do
  mkdir -p "packages/$package/src"

  cat > "packages/$package/package.json" <<EOF
{
  "name": "@flashurl/$package",
  "version": "1.0.0",
  "private": true
}
EOF
done

# --------------------------------------------------
# 4. Configure individual backend services
# --------------------------------------------------

for service in \
  analytics-service \
  redirect-service \
  url-service \
  user-service
do

  case "$service" in
    url-service) PORT=4001 ;;
    redirect-service) PORT=4002 ;;
    user-service) PORT=4003 ;;
    analytics-service) PORT=4004 ;;
  esac

  SERVICE_DIR="apps/$service"
  PACKAGE_NAME="@flashurl/$service"

  mkdir -p \
    "$SERVICE_DIR/src/config" \
    "$SERVICE_DIR/src/health" \
    "$SERVICE_DIR/tests"

  # Service package.json
  cat > "$SERVICE_DIR/package.json" <<EOF
{
  "name": "$PACKAGE_NAME",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "dotenv": "^16.6.1",
    "express": "^5.1.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^24.0.10",
    "tsx": "^4.20.3",
    "typescript": "^5.9.2"
  }
}
EOF

  # Service TypeScript configuration
  cat > "$SERVICE_DIR/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

  # Environment example
  cat > "$SERVICE_DIR/.env.example" <<EOF
NODE_ENV=development
SERVICE_NAME=$service
HOST=0.0.0.0
PORT=$PORT
EOF

  # Environment validation
  cat > "$SERVICE_DIR/src/config/env.ts" <<EOF
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  SERVICE_NAME: z.string().default("$service"),

  HOST: z.string().default("0.0.0.0"),

  PORT: z.coerce.number().int().min(1).max(65535).default($PORT)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration:",
    parsedEnv.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = parsedEnv.data;
EOF

  # Health route
  cat > "$SERVICE_DIR/src/health/health.routes.ts" <<'EOF'
import { Router } from "express";
import { env } from "../config/env";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };
EOF

  # Express application
  cat > "$SERVICE_DIR/src/app.ts" <<'EOF'
import express from "express";
import { healthRouter } from "./health/health.routes";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);

export { app };
EOF

  # Service entry point and graceful shutdown
  cat > "$SERVICE_DIR/src/server.ts" <<'EOF'
import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`
  );
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`${signal} received. Shutting down ${env.SERVICE_NAME}...`);

  server.close((error) => {
    if (error) {
      console.error("Graceful shutdown failed:", error);
      process.exitCode = 1;
    }

    process.exit();
  });

  // Force shutdown if connections do not close in time.
  setTimeout(() => {
    console.error("Shutdown timeout. Closing remaining connections.");

    server.closeAllConnections();
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
EOF

  echo "Configured $service on port $PORT"

done

echo ""
echo "FlashURL Phase 1 configuration completed."
echo "Next: run npm install from the repository root."
