
import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationFn } from "umzug";

export const up: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.addColumn("users", "role", {
    type: DataTypes.ENUM("user", "admin"),
    allowNull: false,
    defaultValue: "user",
  });
};

export const down: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.removeColumn("users", "role");
};
