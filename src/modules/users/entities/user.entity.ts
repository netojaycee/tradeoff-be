import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  UserRole,
  UserStatus,
  SellerStatus,
  VerificationStatus,
} from 'src/common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Prop({
    type: String,
    enum: SellerStatus,
    default: SellerStatus.NOT_SELLER,
  })
  sellerStatus: SellerStatus;

  // Profile Information
  @Prop()
  avatar?: string;

  @Prop()
  bio?: string;

  @Prop()
  website?: string;

  @Prop([String])
  socialMedia?: string[];

  // Address Information
  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'Nigeria' },
      postalCode: String,
      isDefault: { type: Boolean, default: false },
    },
  })
  addresses?: Array<{
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    isDefault: boolean;
  }>;

  // Nigerian Verification
  @Prop()
  nin?: string; // National Identification Number

  @Prop()
  bvn?: string; // Bank Verification Number

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  ninVerificationStatus: VerificationStatus;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  bvnVerificationStatus: VerificationStatus;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  phoneVerificationStatus: VerificationStatus;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  emailVerificationStatus: VerificationStatus;

  // Seller Information
  @Prop()
  businessName?: string;

  @Prop()
  businessRegistration?: string;

  @Prop()
  taxId?: string;

  @Prop({
    type: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      sortCode: String,
    },
  })
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    sortCode: string;
  };

  // Seller Metrics
  @Prop({ default: 0 })
  totalSales: number;

  @Prop({ default: 0 })
  totalRevenue: number;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 0 })
  successfulTransactions: number;

  // Buyer Metrics
  @Prop({ default: 0 })
  totalPurchases: number;

  @Prop({ default: 0 })
  totalSpent: number;

  // Account Security
  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lockedUntil?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string;

  // Preferences
  @Prop({
    type: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
    },
    default: {},
  })
  notificationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };

  // Activity Tracking
  @Prop([Types.ObjectId])
  favoriteProducts?: Types.ObjectId[];

  @Prop([Types.ObjectId])
  followedSellers?: Types.ObjectId[];

  @Prop([String])
  recentSearches?: string[];

  @Prop({ default: Date.now })
  lastActive: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for performance
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ nin: 1 });
UserSchema.index({ bvn: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ sellerStatus: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ createdAt: -1 });

// Remove password from JSON output
UserSchema.methods.toJSON = function (this: UserDocument) {
  const userObject = this.toObject() as Record<string, any>;
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.emailVerificationToken;
  delete userObject.twoFactorSecret;
  return userObject;
};
