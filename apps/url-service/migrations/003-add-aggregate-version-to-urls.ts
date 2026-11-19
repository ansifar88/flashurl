
import {
  DataTypes,
  type QueryInterface,
} from "sequelize";

export async function up(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.addColumn("urls", "aggregate_version", {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  });
}

export async function down(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.removeColumn("urls", "aggregate_version");
}
