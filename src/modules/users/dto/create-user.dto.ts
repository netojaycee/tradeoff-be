import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  Matches,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  UserRole,
  UserStatus,
  SellerStatus,
} from '../../../common/enums/user.enum';

class AddressDto {
  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty({ default: 'Nigeria' })
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isDefault: boolean;
}

class BankDetailsDto {
  @ApiProperty()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  accountName: string;

  @ApiProperty()
  @IsString()
  sortCode: string;
}

class NotificationPreferencesDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  emailNotifications: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  smsNotifications: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  pushNotifications: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  marketingEmails: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  lastName: string;

  @ApiProperty({ example: '+2348123456789', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'Please provide a valid Nigerian phone number',
  })
  phoneNumber?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date of birth' })
  dateOfBirth?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.USER, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    enum: SellerStatus,
    default: SellerStatus.NOT_SELLER,
    required: false,
  })
  @IsOptional()
  @IsEnum(SellerStatus)
  sellerStatus?: SellerStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  socialMedia?: string[];

  @ApiProperty({ type: [AddressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'NIN must be 11 digits' })
  nin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'BVN must be 11 digits' })
  bvn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessRegistration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ type: BankDetailsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @ApiProperty({ type: NotificationPreferencesDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  // Internal fields for registration
  @IsOptional()
  @IsString()
  emailVerificationToken?: string;

  @IsOptional()
  @IsDateString()
  emailVerificationExpires?: Date;

  @IsOptional()
  @IsString()
  passwordResetToken?: string;

  @IsOptional()
  @IsDateString()
  passwordResetExpires?: Date;
}
