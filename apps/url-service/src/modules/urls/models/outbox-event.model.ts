import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from "sequelize";
import { sequelize } from "../../../infrastructure/database/connection";

export type OutboxEventStatus =
  | "pending"
  | "processing"
  | "published"
  | "failed";

export class OutboxEvent extends Model<
  InferAttributes<OutboxEvent>,
  InferCreationAttributes<OutboxEvent>
> {
  declare id: CreationOptional<string>;
  declare eventId: string;
  declare aggregateId: string;
  declare eventType: string;
  declare eventVersion: number;
  declare payload: Record<string, unknown>;
  declare status: CreationOptional<OutboxEventStatus>;
  declare attempts: CreationOptional<number>;
  declare availableAt: CreationOptional<Date>;
  declare publishedAt: CreationOptional<Date | null>;
  declare lastError: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare occurredAt: CreationOptional<Date>;
  declare aggregateVersion: number;
}

OutboxEvent.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      field: "event_id",
    },
    aggregateId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: "aggregate_id",
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "event_type",
    },
    eventVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "event_version",
    },
    aggregateVersion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: "aggregate_version",
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
    availableAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "available_at",
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "published_at",
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "last_error",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "occurred_at",
    },
  },
  {
    sequelize,
    tableName: "outbox_events",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_outbox_status_available",
        fields: ["status", "available_at"],
      },
      {
        name: "idx_outbox_aggregate",
        fields: ["aggregate_id"],
      },
    ],
  },
);
