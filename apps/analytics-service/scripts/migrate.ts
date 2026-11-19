import { Umzug, SequelizeStorage } from "umzug";
import type { QueryInterface } from "sequelize";

import { sequelize } from "../src/infrastructure/database/connection";
import * as clickEventsMigration from "../migrations/001-create-click-events";
import * as urlDimensionsMigration from "../migrations/002-create-url-dimensions";
import * as lastEventAtMigration from "../migrations/003-add-last-event-at-to-url-dimensions";
import * as urlEventStatesMigration from "../migrations/004-create-url-event-states";

async function migrate(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  const migrator = new Umzug<QueryInterface>({
    migrations: [
      {
        name: "001-create-click-events",
        up: async ({ context }) => clickEventsMigration.up(context),
        down: async ({ context }) => clickEventsMigration.down(context),
      },
      {
        name: "002-create-url-dimensions",
        up: async ({ context }) => urlDimensionsMigration.up(context),
        down: async ({ context }) => urlDimensionsMigration.down(context),
      },
      {
        name: "003-add-last-event-at-to-url-dimensions",
        up: async ({ context }) => lastEventAtMigration.up(context),
        down: async ({ context }) => lastEventAtMigration.down(context),
      },
      {
        name: "004-create-url-event-states",
        up: async ({ context }) => urlEventStatesMigration.up(context),
        down: async ({ context }) => urlEventStatesMigration.down(context),
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

    console.log("Connected to Analytics database.");

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
