import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import {
  JwtPayload,
  DeviceInfo,
} from '../../common/interfaces/common.interface';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { VerificationStatus, UserStatus } from '../../common/enums/user.enum';
import { generate6DigitCode } from '../../utils/code-generator';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(registerDto: RegisterDto, deviceInfo: DeviceInfo) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds =
      this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      emailVerificationToken: generate6DigitCode(),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        user.emailVerificationToken || '',
      );
    } catch (error) {
      // Log the error but don't fail the registration process
      console.error('Failed to send verification email:', error);
    }

    // Log registration
    await this.auditLogService.log({
      action: 'user_registration',
      userId: user.id,
      userEmail: user.email,
      description: 'User registered successfully',
      deviceInfo,
    });

    // DON'T generate tokens for unverified users
    // They must verify email first before getting access

    return {
      message:
        'Registration successful. Please check your email for verification.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: false,
      },
      // No tokens until email verified
      requiresVerification: true,
    };
  }

  async login(loginDto: LoginDto, deviceInfo: DeviceInfo) {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.usersService.incrementLoginAttempts(user.id);

      // Log failed login attempt
      await this.auditLogService.log({
        action: 'user_login',
        userId: user.id,
        userEmail: user.email,
        description: 'Failed login attempt - invalid password',
        deviceInfo,
        riskLevel: 'medium',
        suspicious: true,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check if email is verified
    if (user.emailVerificationStatus !== VerificationStatus.VERIFIED) {
      // Generate new verification code if expired or doesn't exist
      const needsNewCode =
        !user.emailVerificationToken ||
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < new Date();

      if (needsNewCode) {
        const verificationCode = generate6DigitCode();
        const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await this.usersService.updateVerificationCode(
          user.id,
          verificationCode,
          expiryDate,
        );

        // Send verification email
        try {
          await this.emailService.sendVerificationEmail(
            user.email,
            user.firstName,
            verificationCode,
          );
        } catch (error) {
          console.error('Failed to send verification email:', error);
        }
      }

      // Log unverified login attempt
      await this.auditLogService.log({
        action: 'user_login_attempt',
        userId: user.id,
        userEmail: user.email,
        description: 'Login attempt with unverified email',
        deviceInfo,
        riskLevel: 'low',
      });

      throw new UnauthorizedException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Please verify your email address to continue. A new verification code has been sent.',
        email: user.email,
        needsVerification: true,
      });
    }

    // Reset login attempts on successful login
    await this.usersService.resetLoginAttempts(user.id, deviceInfo.ip);

    // Log successful login
    await this.auditLogService.log({
      action: 'user_login',
      userId: user.id,
      userEmail: user.email,
      description: 'User logged in successfully',
      deviceInfo,
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified:
          user.emailVerificationStatus === VerificationStatus.VERIFIED,
        sellerStatus: user.sellerStatus,
      },
      ...tokens,
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    deviceInfo: DeviceInfo,
  ) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal if email exists or not
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = generate6DigitCode();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(
      user.id,
      resetToken,
      resetExpires,
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    // Log password reset request
    await this.auditLogService.log({
      action: 'password_reset',
      userId: user.id,
      userEmail: user.email,
      description: 'Password reset requested',
      deviceInfo,
    });

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    deviceInfo: DeviceInfo,
  ) {
    const user = await this.usersService.findByPasswordResetToken(
      resetPasswordDto.code,
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset code has expired');
    }

    // Hash new password
    const saltRounds =
      this.configService.get<number>('security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.newPassword,
      saltRounds,
    );

    // Update password and clear reset token
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Log password reset
    await this.auditLogService.log({
      action: 'password_reset',
      userId: user.id,
      userEmail: user.email,
      description: 'Password reset completed successfully',
      deviceInfo,
    });

    return {
      message:
        'Password reset successful. You can now login with your new password.',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'fallback-refresh-secret',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens({
        sub: user.id.toString(),
        email: user.email,
        role: user.role,
      });

      return tokens;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(code: string) {
    const user = await this.usersService.findByEmailVerificationToken(code);

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Verification code has expired');
    }

    await this.usersService.markEmailAsVerified(user.id);

    // Send welcome email after successful verification
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      // Log the error but don't fail the verification process
      console.error('Failed to send welcome email:', error);
    }

    // Generate tokens now that email is verified
    const tokens = await this.generateTokens({
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: true,
      },
      ...tokens,
    };
  }

  async resendVerificationCode(email: string, deviceInfo: DeviceInfo) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not
      return {
        message: 'If the email exists, a verification code has been sent.',
      };
    }

    if (user.emailVerificationStatus === VerificationStatus.VERIFIED) {
      return {
        message: 'Email is already verified.',
      };
    }

    // Generate new verification code
    const newCode = generate6DigitCode();
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new code
    await this.usersService.updateVerificationCode(
      user.id,
      newCode,
      newExpires,
    );

    // Send new verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.firstName,
      newCode,
    );

    // Log resend action
    await this.auditLogService.log({
      action: 'user_registration',
      userId: user.id,
      userEmail: user.email,
      description: 'Verification code resent',
      deviceInfo,
    });

    return {
      message: 'If the email exists, a verification code has been sent.',
    };
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.secret') || 'default-secret',
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'default-refresh-secret',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiration') || '24h',
    };
  }
}
