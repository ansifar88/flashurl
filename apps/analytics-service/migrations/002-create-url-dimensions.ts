
import {
  DataTypes,
  type QueryInterface,
} from "sequelize";

export async function up(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable("url_dimensions", {
    url_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },

    short_code: {
      type: DataTypes.STRING(16),
      allowNull: false,
      unique: true,
    },

    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },

    owner_type: {
      type: DataTypes.ENUM("guest", "registered"),
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    "url_dimensions",
    ["user_id", "created_at"],
    { name: "idx_url_dimensions_user_created" },
  );

  await queryInterface.addIndex(
    "url_dimensions",
    ["owner_type", "created_at"],
    { name: "idx_url_dimensions_owner_created" },
  );

  await queryInterface.addIndex(
    "url_dimensions",
    ["expires_at"],
    { name: "idx_url_dimensions_expires_at" },
  );

  await queryInterface.addIndex(
    "url_dimensions",
    ["deleted_at"],
    { name: "idx_url_dimensions_deleted_at" },
  );
}

export async function down(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.dropTable("url_dimensions");
}
