
import {
  DataTypes,
  type QueryInterface
} from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable("urls", {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true
    },

    short_code: {
      type: DataTypes.STRING(16),
      allowNull: false,
      unique: true
    },

    original_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true
    },

    custom_alias: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex("urls", ["user_id"], {
    name: "idx_urls_user_id"
  });

  await queryInterface.addIndex("urls", ["expires_at"], {
    name: "idx_urls_expires_at"
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable("urls");
}
