import { Sequelize } from "sequelize";
import { env } from "../../config/env";

export const sequelize = new Sequelize(
  env.ANALYTICS_DB_NAME,
  env.ANALYTICS_DB_USER,
  env.ANALYTICS_DB_PASSWORD,
  {
    host: env.ANALYTICS_DB_HOST,
    port: env.ANALYTICS_DB_PORT,
    dialect: "mysql",

    timezone: "+00:00",

    dialectOptions: {
      timezone: "+00:00",
    },

    logging: false,

    pool: {
      min: env.ANALYTICS_DB_POOL_MIN,
      max: env.ANALYTICS_DB_POOL_MAX,
      acquire: 30_000,
      idle: 10_000,
    },
  },
);
