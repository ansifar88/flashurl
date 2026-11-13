#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Configuring FlashURL local infrastructure..."

# --------------------------------------------------
# 1. Root environment template
# --------------------------------------------------

cat > .env.example <<'EOF'
# MySQL
MYSQL_ROOT_PASSWORD=flashurl_local_root_password
URL_DB_PASSWORD=flashurl_local_url_password
USER_DB_PASSWORD=flashurl_local_user_password
ANALYTICS_DB_PASSWORD=flashurl_local_analytics_password

# Redis
REDIS_PASSWORD=flashurl_local_redis_password

# Kafka
KAFKA_BROKERS=localhost:29092
EOF

# Create local .env only if it does not exist.
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created root .env"
else
  echo "Existing root .env preserved"
fi

# --------------------------------------------------
# 2. MySQL database initialization
# --------------------------------------------------

mkdir -p infrastructure/mysql/init

cat > infrastructure/mysql/init/01-create-databases.sql <<'EOF'
CREATE DATABASE IF NOT EXISTS flashurl_urls
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS flashurl_users
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS flashurl_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

cat > infrastructure/mysql/init/02-create-users.sh <<'EOF'
#!/usr/bin/env bash
set -e

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL

CREATE USER IF NOT EXISTS 'flashurl_url'@'%'
  IDENTIFIED BY '${URL_DB_PASSWORD}';

CREATE USER IF NOT EXISTS 'flashurl_user'@'%'
  IDENTIFIED BY '${USER_DB_PASSWORD}';

CREATE USER IF NOT EXISTS 'flashurl_analytics'@'%'
  IDENTIFIED BY '${ANALYTICS_DB_PASSWORD}';

GRANT ALL PRIVILEGES ON flashurl_urls.*
  TO 'flashurl_url'@'%';

GRANT ALL PRIVILEGES ON flashurl_users.*
  TO 'flashurl_user'@'%';

GRANT ALL PRIVILEGES ON flashurl_analytics.*
  TO 'flashurl_analytics'@'%';

FLUSH PRIVILEGES;

SQL
EOF

chmod +x infrastructure/mysql/init/02-create-users.sh

# --------------------------------------------------
# 3. Redis configuration
# --------------------------------------------------

cat > infrastructure/redis/redis.conf <<'EOF'
bind 0.0.0.0
protected-mode yes

port 6379

timeout 0
tcp-keepalive 300

daemonize no
supervised no

loglevel notice

databases 16

appendonly yes
appendfsync everysec

maxmemory 512mb
maxmemory-policy allkeys-lru

save 900 1
save 300 10
save 60 10000

dir /data
EOF

# --------------------------------------------------
# 4. Kafka topic definitions
# --------------------------------------------------

cat > infrastructure/kafka/topics/topics.yaml <<'EOF'
topics:
  - name: url.created
    partitions: 6
    replicationFactor: 1

  - name: url.updated
    partitions: 6
    replicationFactor: 1

  - name: url.deleted
    partitions: 6
    replicationFactor: 1

  - name: url.clicked
    partitions: 12
    replicationFactor: 1

  - name: flashurl.dlq
    partitions: 3
    replicationFactor: 1
EOF

# --------------------------------------------------
# 5. Docker Compose
# --------------------------------------------------

cat > docker-compose.yml <<'EOF'
name: flashurl

services:

  mysql:
    image: mysql:8.4
    container_name: flashurl-mysql
    restart: unless-stopped

    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?Set MYSQL_ROOT_PASSWORD}
      URL_DB_PASSWORD: ${URL_DB_PASSWORD:?Set URL_DB_PASSWORD}
      USER_DB_PASSWORD: ${USER_DB_PASSWORD:?Set USER_DB_PASSWORD}
      ANALYTICS_DB_PASSWORD: ${ANALYTICS_DB_PASSWORD:?Set ANALYTICS_DB_PASSWORD}

    ports:
      - "127.0.0.1:3306:3306"

    volumes:
      - mysql_data:/var/lib/mysql
      - ./infrastructure/mysql/init:/docker-entrypoint-initdb.d:ro

    healthcheck:
      test:
        - CMD-SHELL
        - mysqladmin ping -h 127.0.0.1 -uroot -p"$${MYSQL_ROOT_PASSWORD}" --silent
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 40s

    networks:
      - flashurl-network

  redis:
    image: redis:7.4-alpine
    container_name: flashurl-redis
    restart: unless-stopped

    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?Set REDIS_PASSWORD}

    command:
      - sh
      - -c
      - exec redis-server /usr/local/etc/redis/redis.conf --requirepass "$$REDIS_PASSWORD"

    ports:
      - "127.0.0.1:6379:6379"

    volumes:
      - redis_data:/data
      - ./infrastructure/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro

    healthcheck:
      test:
        - CMD-SHELL
        - redis-cli --no-auth-warning -a "$$REDIS_PASSWORD" ping | grep -q PONG
      interval: 10s
      timeout: 5s
      retries: 10

    networks:
      - flashurl-network

  kafka:
    image: apache/kafka:4.1.0
    container_name: flashurl-kafka
    restart: unless-stopped

    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller

      KAFKA_LISTENERS: INTERNAL://:9092,CONTROLLER://:9093,EXTERNAL://:29092
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:29092

      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT

      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093

      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1

      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"

      KAFKA_LOG_DIRS: /var/lib/kafka/data
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk

    ports:
      - "127.0.0.1:29092:29092"

    volumes:
      - kafka_data:/var/lib/kafka/data

    healthcheck:
      test:
        - CMD-SHELL
        - /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1
      interval: 15s
      timeout: 10s
      retries: 15
      start_period: 40s

    networks:
      - flashurl-network

volumes:
  mysql_data:
  redis_data:
  kafka_data:

networks:
  flashurl-network:
    driver: bridge
EOF

# --------------------------------------------------
# 6. Git ignore
# --------------------------------------------------

cat > .gitignore <<'EOF'
node_modules/
dist/
.next/
coverage/
.env
.env.*
!.env.example
!.*/.env.example

.DS_Store
*.log

.idea/
.vscode/

load-tests/results/*
!load-tests/results/.gitkeep

EOF

echo ""
echo "Phase 2 configuration generated."
echo "Review the files before starting Docker Compose."
