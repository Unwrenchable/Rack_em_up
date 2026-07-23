import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../users/users.module';
import { AuthV2Controller } from './auth-v2.controller';
import { AuthV2Service } from './auth-v2.service';

import { RefreshToken } from './entities/refresh-token.entity';
import { DeviceSession } from './entities/device-session.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshTokenService } from './services/refresh-token.service';
import { DeviceSessionsService } from './services/device-sessions.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';



@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      RefreshToken,
      DeviceSession,
      EmailVerificationToken,
      PasswordResetToken,
    ]),
  ],
  controllers: [AuthV2Controller],
  providers: [
    AuthV2Service,
    JwtService,
    RefreshTokenService,
    DeviceSessionsService,
    EmailVerificationService,
    PasswordResetService,
  ],
  exports: [AuthV2Service],
})
export class AuthV2Module {}

