import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export type UrlOwnerType = "guest" | "registered";

export class UrlDimension extends Model<
  InferAttributes<UrlDimension>,
  InferCreationAttributes<UrlDimension>
> {
  declare urlId: string;
  declare shortCode: string;
  declare userId: CreationOptional<string | null>;
  declare ownerType: UrlOwnerType;
  declare createdAt: Date;
  declare expiresAt: CreationOptional<Date | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare updatedAt: Date;
  declare lastEventAt: Date;

  static initialize(sequelize: Sequelize): void {
    UrlDimension.init(
      {
        urlId: {
          type: DataTypes.CHAR(36),
          primaryKey: true,
          allowNull: false,
          field: "url_id",
        },

        shortCode: {
          type: DataTypes.STRING(16),
          allowNull: false,
          unique: true,
          field: "short_code",
        },

        userId: {
          type: DataTypes.CHAR(36),
          allowNull: true,
          field: "user_id",
        },

        ownerType: {
          type: DataTypes.ENUM("guest", "registered"),
          allowNull: false,
          field: "owner_type",
        },

        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
        },

        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "expires_at",
        },

        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "deleted_at",
        },

        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "updated_at",
        },
        lastEventAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "last_event_at",
        },
      },
      {
        sequelize,
        tableName: "url_dimensions",
        timestamps: false,
        indexes: [
          {
            fields: ["user_id", "created_at"],
            name: "idx_url_dimensions_user_created",
          },
          {
            fields: ["owner_type", "created_at"],
            name: "idx_url_dimensions_owner_created",
          },
          {
            fields: ["expires_at"],
            name: "idx_url_dimensions_expires_at",
          },
          {
            fields: ["deleted_at"],
            name: "idx_url_dimensions_deleted_at",
          },
        ],
      },
    );
  }
}
