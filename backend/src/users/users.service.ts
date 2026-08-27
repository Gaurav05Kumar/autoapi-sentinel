import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, name?: string) {
    return this.prisma.user.create({
      data: {
        email,
        name,
        password: 'temporary-password',
      },
    });
  }
}