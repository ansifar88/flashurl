import { Umzug, SequelizeStorage } from "umzug";
import type { QueryInterface } from "sequelize";

import { sequelize } from "../src/infrastructure/database/connection";

import * as createUsers from "../migrations/001-create-users";
import * as addUserRole from "../migrations/002-add-user-role";

const migrator = new Umzug<QueryInterface>({
  migrations: [
    {
      name: "001-create-users",
      up: createUsers.up,
      down: createUsers.down,
    },
    {
      name: "002-add-user-role",
      up: addUserRole.up,
      down: addUserRole.down,
    },
  ],

  context: sequelize.getQueryInterface(),

  storage: new SequelizeStorage({
    sequelize,
    tableName: "SequelizeMeta",
  }),

  logger: console,
});

async function runMigrations(): Promise<void> {
  try {
    await sequelize.authenticate();

    console.log("[Migration] Database connection established.");

    const command = process.argv[2] ?? "up";

    if (command === "up") {
      await migrator.up();
      console.log("[Migration] Migrations completed.");
    } else if (command === "down") {
      await migrator.down();
      console.log("[Migration] Rollback completed.");
    } else {
      throw new Error(`Unknown migration command: ${command}`);
    }
  } catch (error) {
    console.error("[Migration] Failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void runMigrations();
