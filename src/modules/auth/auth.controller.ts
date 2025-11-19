import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { Public } from '../../common/decorators/public.decorator';
import { DeviceInfo } from '../../common/interfaces/common.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      os: this.getOS(req.headers['user-agent'] || ''),
    };

    return this.authService.register(registerDto, deviceInfo);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      os: this.getOS(req.headers['user-agent'] || ''),
    };

    return this.authService.login(loginDto, deviceInfo);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      os: this.getOS(req.headers['user-agent'] || ''),
    };

    return this.authService.forgotPassword(forgotPasswordDto, deviceInfo);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      os: this.getOS(req.headers['user-agent'] || ''),
    };

    return this.authService.resetPassword(resetPasswordDto, deviceInfo);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Get('verify-email/:code')
  @ApiOperation({ summary: 'Verify email address via URL parameter' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmail(@Param('code') code: string) {
    return this.authService.verifyEmail(code);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address via JSON body' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmailPost(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.code);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent if email exists',
  })
  async resendVerificationCode(
    @Body() resendCodeDto: ResendCodeDto,
    @Req() req: Request,
  ) {
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      os: this.getOS(req.headers['user-agent'] || ''),
    };

    return this.authService.resendVerificationCode(
      resendCodeDto.email,
      deviceInfo,
    );
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: any) {
    return {
      message: 'Profile retrieved successfully',
      user: req.user,
    };
  }

  // Helper methods for device detection
  private getDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  }
}
