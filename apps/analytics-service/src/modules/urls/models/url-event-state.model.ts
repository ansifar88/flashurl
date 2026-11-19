
import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class UrlEventState extends Model<
  InferAttributes<UrlEventState>,
  InferCreationAttributes<UrlEventState>
> {
  declare urlId: string;
  declare lastAggregateVersion: number;
  declare lastEventId: string;
  declare isDeleted: boolean;
  declare updatedAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    UrlEventState.init(
      {
        urlId: {
          type: DataTypes.CHAR(36),
          primaryKey: true,
          allowNull: false,
          field: "url_id",
        },

        lastAggregateVersion: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: "last_aggregate_version",
        },

        lastEventId: {
          type: DataTypes.CHAR(36),
          allowNull: false,
          field: "last_event_id",
        },

        isDeleted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "is_deleted",
        },

        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "updated_at",
        },
      },
      {
        sequelize,
        tableName: "url_event_states",
        timestamps: false,
        indexes: [
          {
            fields: ["last_event_id"],
            name: "idx_url_event_states_last_event",
          },
        ],
      },
    );
  }
}
