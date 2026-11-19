
import { Sequelize } from "sequelize";
import { env } from "../../config/env";

export const sequelize = new Sequelize(
  env.DB_NAME,
  env.DB_USER,
  env.DB_PASSWORD,
  {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: "mysql",
    timezone: "+00:00",
    logging: false,

    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      underscored: true,
      freezeTableName: true,
    },

    retry: {
      max: 2,
    },
  }
);
