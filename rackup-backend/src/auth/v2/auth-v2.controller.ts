import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthV2Service } from './auth-v2.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutAllDto } from './dto/logout-all.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { DeviceSessionRevokedDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth/v2')
export class AuthV2Controller {
  constructor(private readonly authV2Service: AuthV2Service) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authV2Service.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authV2Service.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authV2Service.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: Request & { user: any }, @Body() dto: LogoutDto) {
    return this.authV2Service.logout(req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: Request & { user: any }, @Body() dto: LogoutAllDto) {
    return this.authV2Service.logoutAll(req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  listSessions(@Req() req: Request & { user: any }) {
    return this.authV2Service.listSessions(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke')
  revokeSession(@Req() req: Request & { user: any }, @Body() dto: DeviceSessionRevokedDto) {
    return this.authV2Service.revokeSession(req.user, dto);
  }

  @Post('email/send')
  sendVerification(@Body() dto: { email: string }) {
    return this.authV2Service.sendEmailVerification(dto.email);
  }

  @Post('email/verify')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authV2Service.verifyEmail(dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authV2Service.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authV2Service.confirmPasswordReset(dto);
  }
}

