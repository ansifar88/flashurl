import type { MigrationFn } from "umzug";
import { DataTypes, type QueryInterface } from "sequelize";

export const up: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.createTable("outbox_events", {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
    },
    aggregate_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    event_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "published", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    available_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await context.addIndex("outbox_events", ["status", "available_at"], {
    name: "idx_outbox_status_available",
  });

  await context.addIndex("outbox_events", ["aggregate_id"], {
    name: "idx_outbox_aggregate",
  });
};

export const down: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.dropTable("outbox_events");
};
