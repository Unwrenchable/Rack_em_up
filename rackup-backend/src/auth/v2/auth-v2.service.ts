import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/users.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutAllDto } from './dto/logout-all.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { RefreshTokenService } from './services/refresh-token.service';
import { DeviceSessionsService } from './services/device-sessions.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';

@Injectable()
export class AuthV2Service {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly deviceSessionsService: DeviceSessionsService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async signup(dto: SignupDto): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      displayName: dto.display_name,
    });

    const { accessToken, refreshToken } = await this.loginIssueTokens(user, {
      userAgent: dto.userAgent ?? null,
      ip: dto.ip ?? null,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async login(dto: LoginDto): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = await this.loginIssueTokens(user, {
      userAgent: dto.userAgent ?? null,
      ip: dto.ip ?? null,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(dto: RefreshDto): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = dto.refreshToken;
    const hashed = await this.refreshTokenService.hashToken(refreshToken);

    const rt = await this.refreshTokenService.findActiveByHashedToken(hashed);
    if (!rt) throw new UnauthorizedException('Invalid refresh token');

    if (rt.revoked) throw new UnauthorizedException('Refresh token revoked');
    if (rt.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Refresh token expired');

    // rotate: revoke old + create a new one in same device session
    await this.refreshTokenService.revokeById(rt.id);

    const user = await this.usersService.findById(rt.userId);
    if (!user) throw new UnauthorizedException('Invalid refresh token user');

    const payload = this.buildAccessPayload(user);
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'dev_access_secret',
      expiresIn: '15m',
    });

    const { refreshToken: newRefreshToken } = await this.refreshTokenService.issueNewRefreshTokenRaw(user, rt.deviceSessionId);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(user: any, dto: LogoutDto): Promise<{ ok: true }> {
    await this.deviceSessionsService.revokeSessionForUser(user.id, dto.deviceSessionId);
    return { ok: true };
  }

  async logoutAll(user: any, _dto: LogoutAllDto): Promise<{ ok: true }> {
    await this.deviceSessionsService.revokeAllForUser(user.id);
    return { ok: true };
  }

  async listSessions(user: any): Promise<any> {
    return this.deviceSessionsService.listForUser(user.id);
  }

  async revokeSession(user: any, dto: { deviceSessionId: string }): Promise<{ ok: true }> {
    await this.deviceSessionsService.revokeSessionForUser(user.id, dto.deviceSessionId);
    return { ok: true };
  }

  async sendEmailVerification(email: string): Promise<{ ok: true }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerifiedAt) return { ok: true };

    await this.emailVerificationService.createTokenForUser(user.id);
    // Email transport is intentionally omitted in this backend-only task.
    return { ok: true };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ ok: true }> {
    const user = await this.emailVerificationService.verifyToken(dto.token, dto.userId);
    if (!user) throw new UnauthorizedException('Invalid or expired verification token');

    await this.usersService.markEmailVerified(user.id);
    return { ok: true };
  }

  async requestPasswordReset(dto: PasswordResetRequestDto): Promise<{ ok: true }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return { ok: true };
    await this.passwordResetService.createTokenForUser(user.id);
    return { ok: true };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto): Promise<{ ok: true }> {
    const userId = await this.passwordResetService.consumeToken(dto.token, dto.userId);
    if (!userId) throw new UnauthorizedException('Invalid or expired reset token');

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.new_password, 10);
    await this.usersService.updatePasswordHash(user.id, passwordHash);

    return { ok: true };
  }

  private buildAccessPayload(user: User) {
    return { sub: user.id, email: user.email, role: user.role };
  }

  private async loginIssueTokens(user: User, ctx: { userAgent: string | null; ip: string | null }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.buildAccessPayload(user);

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'dev_access_secret',
      expiresIn: '15m',
    });

    const deviceSession = await this.deviceSessionsService.createSession(user.id, {
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    const refreshToken = await this.refreshTokenService.issueNewRefreshTokenRaw(user, deviceSession.id);

    return { accessToken, refreshToken: (refreshToken as any).refreshToken ?? (refreshToken as any) };
  }
}

