import { Umzug, SequelizeStorage } from "umzug";
import type { QueryInterface } from "sequelize";

import { sequelize } from "../src/infrastructure/database/connection";
import {
  up as createUrls,
  down as dropUrls,
} from "../migrations/001-create-urls";
import * as outboxMigration from "../migrations/002-create-outbox-events";

async function migrate(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  const migrator = new Umzug<QueryInterface>({
    migrations: [
      {
        name: "001-create-urls",
        up: async ({ context }) => createUrls(context),
        down: async ({ context }) => dropUrls(context),
      },
      {
        name: "002-create-outbox-events",
        up: outboxMigration.up,
        down: outboxMigration.down,
      },
    ],

    context: queryInterface,

    storage: new SequelizeStorage({
      sequelize,
      tableName: "SequelizeMeta",
    }),

    logger: console,
  });

  try {
    await sequelize.authenticate();

    console.log("Connected to URL Service database.");

    if (process.argv[2] === "down") {
      await migrator.down();
      console.log("Migration rolled back.");
    } else {
      await migrator.up();
      console.log("Migrations completed.");
    }
  } finally {
    await sequelize.close();
  }
}

migrate().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
