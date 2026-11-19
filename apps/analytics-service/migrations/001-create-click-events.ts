
import {
  DataTypes,
  type QueryInterface,
} from "sequelize";

export async function up(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable("click_events", {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },

    event_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },

    short_code: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },

    referrer: {
      type: DataTypes.STRING(2048),
      allowNull: true,
    },

    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    clicked_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    "click_events",
    ["event_id"],
    {
      unique: true,
      name: "uq_click_events_event_id",
    },
  );

  await queryInterface.addIndex(
    "click_events",
    ["short_code", "clicked_at"],
    {
      name: "idx_click_events_short_code_clicked_at",
    },
  );

  await queryInterface.addIndex(
    "click_events",
    ["clicked_at"],
    {
      name: "idx_click_events_clicked_at",
    },
  );
}

export async function down(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.dropTable("click_events");
}
