import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    name: string,
    description: string | undefined,
    userId: string,
  ) {
    return this.prisma.project.create({
      data: {
        name,
        description,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        userId,
      },
    });
  }

  async findOne(
    id: string,
    userId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return project;
  }

  async remove(
    id: string,
    userId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return this.prisma.project.delete({
      where: {
        id: project.id,
      },
    });
  }
}