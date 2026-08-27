import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, description?: string) {
    return this.prisma.project.create({
      data: {
        name,
        description,
        userId: '32837eac-5b56-4529-bc75-c465fc67c165',
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
