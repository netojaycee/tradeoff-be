import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'A5B9C2',
    description: '6-digit alphanumeric verification code received via email',
    minLength: 6,
    maxLength: 6,
    pattern: '^[A-Z0-9]{6}$',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be exactly 6 characters' })
  @Matches(/^[A-Z0-9]{6}$/, {
    message:
      'Verification code must contain only uppercase letters and numbers',
  })
  code: string;
}
