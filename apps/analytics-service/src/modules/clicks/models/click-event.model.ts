import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class ClickEvent extends Model<
  InferAttributes<ClickEvent>,
  InferCreationAttributes<ClickEvent>
> {
  declare id: CreationOptional<string>;
  declare eventId: string;
  declare shortCode: string;
  declare referrer: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare clickedAt: Date;
  declare createdAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    ClickEvent.init(
      {
        id: {
          type: DataTypes.CHAR(36),
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },

        eventId: {
          type: DataTypes.CHAR(36),
          allowNull: false,
          unique: true,
          field: "event_id",
        },

        shortCode: {
          type: DataTypes.STRING(16),
          allowNull: false,
          field: "short_code",
        },

        referrer: {
          type: DataTypes.STRING(2048),
          allowNull: true,
        },

        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "user_agent",
        },

        clickedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "clicked_at",
        },

        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
        },
      },
      {
        sequelize,
        tableName: "click_events",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["event_id"],
            name: "uq_click_events_event_id",
          },
          {
            fields: ["short_code", "clicked_at"],
            name: "idx_click_events_short_code_clicked_at",
          },
          {
            fields: ["clicked_at"],
            name: "idx_click_events_clicked_at",
          },
        ],
      },
    );
  }
}
