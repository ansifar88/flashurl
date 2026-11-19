
import {
  DataTypes,
  type QueryInterface,
} from "sequelize";

export async function up(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable("url_event_states", {
    url_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },

    last_aggregate_version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },

    last_event_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },

    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    "url_event_states",
    ["last_event_id"],
    {
      name: "idx_url_event_states_last_event",
    },
  );
}

export async function down(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.dropTable("url_event_states");
}
