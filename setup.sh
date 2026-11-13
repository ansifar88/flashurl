
#!/bin/bash

set -e

echo "Creating FlashURL microservices structure..."

# ==========================================
# ROOT CONFIGURATION
# ==========================================

touch \
  README.md \
  .gitignore \
  .env.example \
  .dockerignore \
  package.json \
  package-lock.json \
  tsconfig.base.json \
  eslint.config.js \
  .prettierrc \
  docker-compose.yml \
  Makefile

# ==========================================
# APPLICATION SERVICES
# ==========================================

SERVICES=(
  api-gateway
  url-service
  redirect-service
  user-service
  analytics-service
)

for SERVICE in "${SERVICES[@]}"; do

  mkdir -p "apps/$SERVICE/src/config"

  mkdir -p "apps/$SERVICE/src/modules"

  mkdir -p "apps/$SERVICE/src/infrastructure"

  mkdir -p "apps/$SERVICE/src/middleware"

  mkdir -p "apps/$SERVICE/src/health"

  mkdir -p "apps/$SERVICE/src/utils"

  mkdir -p "apps/$SERVICE/tests/unit"

  mkdir -p "apps/$SERVICE/tests/integration"

  mkdir -p "apps/$SERVICE/tests/e2e"

  mkdir -p "apps/$SERVICE/migrations"

  mkdir -p "apps/$SERVICE/scripts"

  touch \
    "apps/$SERVICE/src/app.ts" \
    "apps/$SERVICE/src/server.ts" \
    "apps/$SERVICE/src/config/env.ts" \
    "apps/$SERVICE/src/health/health.routes.ts" \
    "apps/$SERVICE/Dockerfile" \
    "apps/$SERVICE/package.json" \
    "apps/$SERVICE/tsconfig.json" \
    "apps/$SERVICE/.env.example"

done

# ==========================================
# API GATEWAY
# ==========================================

mkdir -p infrastructure/nginx/conf.d
mkdir -p infrastructure/nginx/includes

touch \
  infrastructure/nginx/nginx.conf \
  infrastructure/nginx/conf.d/default.conf

# ==========================================
# URL SERVICE
# ==========================================

mkdir -p apps/url-service/src/modules/urls/{controllers,services,repositories,models,routes,validators,types}
mkdir -p apps/url-service/src/modules/aliases
mkdir -p apps/url-service/src/infrastructure/{database,kafka/producers,kafka/outbox,cache}
mkdir -p apps/url-service/src/jobs
mkdir -p apps/url-service/src/events

# ==========================================
# REDIRECT SERVICE
# ==========================================

mkdir -p apps/redirect-service/src/modules/redirect/{controllers,services,routes,types}
mkdir -p apps/redirect-service/src/infrastructure/{redis,url-client,kafka/producers,rate-limiter}
mkdir -p apps/redirect-service/src/utils

# ==========================================
# USER SERVICE
# ==========================================

mkdir -p apps/user-service/src/modules/users/{controllers,services,repositories,models,routes,validators}
mkdir -p apps/user-service/src/modules/auth/{controllers,services,middleware}
mkdir -p apps/user-service/src/modules/api-keys
mkdir -p apps/user-service/src/infrastructure/{database,kafka/producers}

# ==========================================
# ANALYTICS SERVICE
# ==========================================

mkdir -p apps/analytics-service/src/modules/analytics/{controllers,services,repositories,models,routes}
mkdir -p apps/analytics-service/src/infrastructure/{database,kafka/consumers,kafka/producers}
mkdir -p apps/analytics-service/src/workers
mkdir -p apps/analytics-service/src/events
mkdir -p apps/analytics-service/src/jobs

# ==========================================
# SHARED PACKAGES
# ==========================================

PACKAGES=(
  contracts
  logger
  observability
  config
  typescript-config
  eslint-config
)

for PACKAGE in "${PACKAGES[@]}"; do
  mkdir -p "packages/$PACKAGE/src"

  touch \
    "packages/$PACKAGE/package.json" \
    "packages/$PACKAGE/tsconfig.json"
done

mkdir -p packages/contracts/src/events
mkdir -p packages/contracts/src/schemas
mkdir -p packages/contracts/src/topics

# ==========================================
# INFRASTRUCTURE
# ==========================================

mkdir -p infrastructure/docker
mkdir -p infrastructure/kafka/{config,scripts,topics}
mkdir -p infrastructure/mysql/{init,migrations}
mkdir -p infrastructure/redis
mkdir -p infrastructure/prometheus
mkdir -p infrastructure/grafana/{dashboards,provisioning/datasources,provisioning/dashboards}
mkdir -p infrastructure/kubernetes/{base,overlays/dev,overlays/staging,overlays/production}
mkdir -p infrastructure/scripts

touch \
  infrastructure/kafka/topics/topics.yaml \
  infrastructure/mysql/init/01-create-databases.sql \
  infrastructure/redis/redis.conf \
  infrastructure/prometheus/prometheus.yml

# ==========================================
# DOCUMENTATION
# ==========================================

mkdir -p docs/{architecture,api,database,events,capacity-planning,security,performance,deployment,adr}

touch \
  docs/architecture/system-architecture.md \
  docs/architecture/service-boundaries.md \
  docs/database/database-design.md \
  docs/events/kafka-event-design.md \
  docs/capacity-planning/capacity-estimation.md \
  docs/security/security-design.md \
  docs/performance/load-test-strategy.md \
  docs/deployment/deployment-guide.md

# ==========================================
# LOAD TESTING
# ==========================================

mkdir -p load-tests/{scenarios,data,results}

touch \
  load-tests/smoke.js \
  load-tests/load.js \
  load-tests/stress.js \
  load-tests/spike.js \
  load-tests/soak.js

# ==========================================
# SCRIPTS
# ==========================================

mkdir -p scripts/{development,maintenance,testing}

touch \
  scripts/development/setup.sh \
  scripts/development/start.sh \
  scripts/testing/run-load-tests.sh

# ==========================================
# GIT KEEP FILES
# ==========================================

find apps packages infrastructure docs load-tests scripts \
  -type d -empty -exec touch '{}/.gitkeep' \;

echo ""
echo "======================================"
echo " FlashURL structure created successfully"
echo "======================================"
echo ""

echo "Project structure:"
tree -a -I 'node_modules|.git|.DS_Store' .

echo ""
echo "Next: configure npm workspaces and Docker Compose."
