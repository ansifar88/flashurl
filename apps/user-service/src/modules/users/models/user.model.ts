import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";
export type UserRole = "user" | "admin";
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare isActive: CreationOptional<boolean>;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare role: CreationOptional<UserRole>;

  static initialize(sequelize: Sequelize): void {
    User.init(
      {
        id: {
          type: DataTypes.CHAR(36),
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4,
        },

        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },

        email: {
          type: DataTypes.STRING(254),
          allowNull: false,
          unique: "uq_users_email",
        },

        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "password_hash",
        },

        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active",
        },

        emailVerifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "email_verified_at",
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
        role: {
          type: DataTypes.ENUM("user", "admin"),
          allowNull: false,
          defaultValue: "user",
        },
      },
      {
        sequelize,
        tableName: "users",
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    );
  }
}
