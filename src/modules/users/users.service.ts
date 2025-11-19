import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus, VerificationStatus } from '../../common/enums/user.enum';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: FilterQuery<UserDocument> = {},
  ): Promise<{ users: UserDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filters),
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ passwordResetToken: token }).exec();
  }

  async findByEmailVerificationToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ emailVerificationToken: token }).exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const attempts = user.loginAttempts + 1;
    const updateData: { loginAttempts: number; lockedUntil?: Date } = {
      loginAttempts: attempts,
    };

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.userModel.findByIdAndUpdate(userId, updateData).exec();
  }

  async resetLoginAttempts(userId: string, ip: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        loginAttempts: 0,
        $unset: { lockedUntil: 1 },
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastActive: new Date(),
      })
      .exec();
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordResetToken: token,
        passwordResetExpires: expires,
      })
      .exec();
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        password: hashedPassword,
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
        },
      })
      .exec();
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        emailVerificationStatus: VerificationStatus.VERIFIED,
        status: UserStatus.ACTIVE,
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
        },
      })
      .exec();
  }

  async updateVerificationCode(
    userId: string,
    code: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        emailVerificationToken: code,
        emailVerificationExpires: expires,
      })
      .exec();
  }

  async updateProfile(
    userId: string,
    profileData: Partial<UserDocument>,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...profileData, lastActive: new Date() },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async addToFavorites(userId: string, productId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $addToSet: { favoriteProducts: productId },
        lastActive: new Date(),
      })
      .exec();
  }

  async removeFromFavorites(userId: string, productId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $pull: { favoriteProducts: productId },
        lastActive: new Date(),
      })
      .exec();
  }

  async followSeller(userId: string, sellerId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $addToSet: { followedSellers: sellerId },
        lastActive: new Date(),
      })
      .exec();
  }

  async unfollowSeller(userId: string, sellerId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        $pull: { followedSellers: sellerId },
        lastActive: new Date(),
      })
      .exec();
  }

  async updateSellerMetrics(
    sellerId: string,
    metrics: {
      totalSales?: number;
      totalRevenue?: number;
      averageRating?: number;
      totalReviews?: number;
      successfulTransactions?: number;
    },
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(sellerId, {
        $inc: metrics,
        lastActive: new Date(),
      })
      .exec();
  }

  async updateBuyerMetrics(
    buyerId: string,
    metrics: {
      totalPurchases?: number;
      totalSpent?: number;
    },
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(buyerId, {
        $inc: metrics,
        lastActive: new Date(),
      })
      .exec();
  }

  async getSellerStats(sellerId: string): Promise<any> {
    const user = await this.findById(sellerId);
    if (!user) {
      throw new NotFoundException('Seller not found');
    }

    return {
      totalSales: user.totalSales,
      totalRevenue: user.totalRevenue,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews,
      successfulTransactions: user.successfulTransactions,
      sellerStatus: user.sellerStatus,
      joinedDate: user.createdAt,
    };
  }

  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ users: UserDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const searchFilter = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { businessName: { $regex: query, $options: 'i' } },
      ],
    };

    const [users, total] = await Promise.all([
      this.userModel
        .find(searchFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(searchFilter),
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
