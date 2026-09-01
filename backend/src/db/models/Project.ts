import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../index';
import { User } from './User';

export class Project extends Model {
  public id!: string;
  public name!: string;
  public user_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'projects',
    timestamps: true,
    underscored: true,
  }
);

Project.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Project, { foreignKey: 'user_id' });
