import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../index';
import { Project } from './Project';

export class Report extends Model {
  public id!: string;
  public project_id!: string;
  public contract_name!: string;
  public findings!: unknown[];
  public gas_profile!: Record<string, unknown> | null;
  public score!: number;
  public ready_for_audit!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Populated when the query includes the Project association.
  public readonly Project?: Project;
}

Report.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    contract_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    findings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    gas_profile: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
    ready_for_audit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'reports',
    timestamps: true,
    underscored: true,
  }
);

Report.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(Report, { foreignKey: 'project_id' });
