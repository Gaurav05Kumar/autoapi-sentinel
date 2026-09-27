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

  // =========================
  // CREATE PROJECT
  // =========================
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

  // =========================
  // GET ALL PROJECTS
  // =========================
  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        userId,
      },
    });
  }

  // =========================
  // GET SINGLE PROJECT
  // =========================
  async findOne(
    id: string,
    userId: string,
  ) {
    console.log(
      '========== FIND PROJECT DEBUG ==========',
    );

    console.log(
      'Requested Project ID:',
      id,
    );

    console.log(
      'Requested User ID:',
      userId,
    );

    // Find project only by ID first
    const project =
      await this.prisma.project.findUnique({
        where: {
          id,
        },
      });

    console.log(
      'Project from DB:',
      project,
    );

    // Project does not exist
    if (!project) {
      throw new NotFoundException(
        'Project does not exist in database',
      );
    }

    // Check project ownership
    if (project.userId !== userId) {
      console.log(
        'USER ID MISMATCH',
      );

      console.log(
        'Project userId:',
        project.userId,
      );

      console.log(
        'Request userId:',
        userId,
      );

      throw new NotFoundException(
        'Project does not belong to this user',
      );
    }

    return project;
  }

  // =========================
  // DELETE PROJECT
  // =========================
  async remove(
    id: string,
    userId: string,
  ) {
    const project =
      await this.prisma.project.findFirst({
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