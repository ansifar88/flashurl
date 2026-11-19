
import {
  DataTypes,
  type QueryInterface,
} from "sequelize";

export async function up(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.addColumn("url_dimensions", "last_event_at", {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  });
}

export async function down(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.removeColumn("url_dimensions", "last_event_at");
}
