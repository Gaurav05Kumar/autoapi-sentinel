import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  @Post('register')
  async register(
    @Body()
    body: {
      name?: string;
      email: string;
      password: string;
    },
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException(
        'Email and password are required',
      );
    }

    if (body.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters',
      );
    }

    return this.authService.register(
      body.name,
      body.email,
      body.password,
    );
  }

  // =========================
  // LOGIN
  // =========================
  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException(
        'Email and password are required',
      );
    }

    const user =
      await this.authService.validateUser(
        body.email,
        body.password,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    return this.authService.login(user);
  }
}