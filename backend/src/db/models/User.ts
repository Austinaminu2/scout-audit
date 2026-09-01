import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../index';

export class User extends Model {
  public id!: string;
  public github_id!: number;
  public github_username!: string;
  public email!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    github_id: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
    },
    github_username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);
