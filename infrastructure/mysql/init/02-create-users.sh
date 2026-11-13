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
