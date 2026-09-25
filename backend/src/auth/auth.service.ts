import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  async register(
    name: string | undefined,
    email: string,
    password: string,
  ) {
    const normalizedEmail =
      email.trim().toLowerCase();

    // Check whether email already exists
    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'Email already registered',
      );
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const user =
      await this.prisma.user.create({
        data: {
          name: name?.trim() || null,
          email: normalizedEmail,
          password: hashedPassword,
        },

        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

    return {
      message: 'Registration successful',
      user,
    };
  }

  // =========================
  // VALIDATE USER
  // =========================
  async validateUser(
    email: string,
    password: string,
  ) {
    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (!user) {
      return null;
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  // =========================
  // LOGIN
  // =========================
  async login(user: {
    id: string;
    email: string;
    name: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      message: 'Login successful',

      accessToken,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}