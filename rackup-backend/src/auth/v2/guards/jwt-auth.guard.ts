import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Uses existing v1 access-token JWT validation strategy name: 'jwt'
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

