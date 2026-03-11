import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'master_admin' | 'admin' | 'project_creator' | 'viewer';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  roles: UserRole[];
  status: 'active' | 'disabled';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      default: ['viewer'],
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
