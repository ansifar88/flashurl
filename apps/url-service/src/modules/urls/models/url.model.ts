import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type Sequelize,
} from "sequelize";

export class Url extends Model<
  InferAttributes<Url>,
  InferCreationAttributes<Url>
> {
  declare id: CreationOptional<string>;
  declare shortCode: string;
  declare originalUrl: string;
  declare userId: CreationOptional<string | null>;
  declare customAlias: CreationOptional<boolean>;
  declare expiresAt: CreationOptional<Date | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare aggregateVersion: CreationOptional<number>;

  static initialize(sequelize: Sequelize): void {
    Url.init(
      {
        id: {
          type: DataTypes.CHAR(36),
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },

        shortCode: {
          type: DataTypes.STRING(16),
          allowNull: false,
          unique: true,
          field: "short_code",
        },

        originalUrl: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: "original_url",
        },

        userId: {
          type: DataTypes.CHAR(36),
          allowNull: true,
          field: "user_id",
        },

        customAlias: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "custom_alias",
        },

        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "expires_at",
        },

        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active",
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
        aggregateVersion: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
          field: "aggregate_version",
        },
      },
      {
        sequelize,
        tableName: "urls",
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ["user_id"],
          },
          {
            fields: ["expires_at"],
          },
        ],
      },
    );
  }
}
