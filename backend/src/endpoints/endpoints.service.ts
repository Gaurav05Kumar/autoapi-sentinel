import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EndpointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    name: string,
    method: string,
    url: string,
  ) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return this.prisma.endpoint.create({
      data: {
        name,
        method,
        url,
        projectId,
      },
    });
  }

  async findAll(
    projectId: string,
    userId: string,
  ) {
    const project =
      await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found',
      );
    }

    return this.prisma.endpoint.findMany({
      where: {
        projectId,
      },
    });
  }

  async run(
    endpointId: string,
    userId: string,
  ) {
    const endpoint =
      await this.prisma.endpoint.findFirst({
        where: {
          id: endpointId,
          project: {
            userId,
          },
        },
      });

    if (!endpoint) {
      throw new NotFoundException(
        'Endpoint not found',
      );
    }

    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: endpoint.method,
          url: endpoint.url,
          validateStatus: () => true,
        }),
      );

      const responseTime =
        Date.now() - startTime;

      const success =
        response.status >= 200 &&
        response.status < 400;

      const result =
        await this.prisma.testResult.create({
          data: {
            endpointId: endpoint.id,
            statusCode: response.status,
            responseTime,
            success,
            responseBody: response.data,
          },
        });

      return {
        id: result.id,
        endpointId: endpoint.id,
        method: endpoint.method,
        url: endpoint.url,
        statusCode: response.status,
        responseTime,
        success,
        responseBody: response.data,
        createdAt: result.createdAt,
      };
    } catch (error) {
      const responseTime =
        Date.now() - startTime;

      const result =
        await this.prisma.testResult.create({
          data: {
            endpointId: endpoint.id,
            statusCode: null,
            responseTime,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Request failed',
          },
        });

      return {
        id: result.id,
        endpointId: endpoint.id,
        method: endpoint.method,
        url: endpoint.url,
        statusCode: null,
        responseTime,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Request failed',
        createdAt: result.createdAt,
      };
    }
  }
}