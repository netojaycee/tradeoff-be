import { IsString, MinLength, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'A5B9C2',
    description: '6-digit verification code received via email',
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 characters' })
  @Matches(/^[A-Z0-9]{6}$/, {
    message:
      'Verification code must contain only uppercase letters and numbers',
  })
  code: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  newPassword: string;
}
