import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class EndpointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // ============================================================
  // CREATE ENDPOINT
  // ============================================================

  async create(
    projectId: string,
    userId: string,
    name: string,
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: Prisma.InputJsonValue,
    expectedStatus?: number,
    maxResponseTime?: number,
  ) {
    // Check project ownership
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
        method: method.toUpperCase(),
        url,
        headers,
        body,
        expectedStatus,
        maxResponseTime,
        projectId,
      },
    });
  }

  // ============================================================
  // GET ALL ENDPOINTS
  // ============================================================

  async findAll(
    projectId: string,
    userId: string,
  ) {
    // Check project ownership
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // RUN ENDPOINT + AUTOMATIC BUG DETECTION
  // ============================================================

  async run(
    endpointId: string,
    userId: string,
  ) {
    // Check endpoint ownership
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
      // --------------------------------------------------------
      // SEND API REQUEST
      // --------------------------------------------------------

      const response =
        await firstValueFrom(
          this.httpService.request({
            method: endpoint.method,

            url: endpoint.url,

            headers:
              endpoint.headers &&
              typeof endpoint.headers ===
                'object'
                ? (endpoint.headers as Record<
                    string,
                    string
                  >)
                : undefined,

            data:
              endpoint.body ??
              undefined,

            // Allow 4xx/5xx so we can analyze them.
            validateStatus: () => true,
          }),
        );

      // --------------------------------------------------------
      // RESPONSE TIME
      // --------------------------------------------------------

      const responseTime =
        Date.now() - startTime;

      const statusCode =
        response.status;

      // 200-399 = HTTP success
      const httpSuccess =
        statusCode >= 200 &&
        statusCode < 400;

      // --------------------------------------------------------
      // BUG VARIABLES
      // --------------------------------------------------------

      let bugDetected = false;

      let bugType: string | null =
        null;

      let bugMessage: string | null =
        null;

      // ========================================================
      // STATUS CODE VALIDATION
      // ========================================================

      if (
        endpoint.expectedStatus !==
          null &&
        endpoint.expectedStatus !==
          undefined &&
        statusCode !==
          endpoint.expectedStatus
      ) {
        bugDetected = true;

        bugType = 'STATUS_CODE';

        bugMessage =
          `Expected status ${endpoint.expectedStatus} ` +
          `but received ${statusCode}`;
      }

      // ========================================================
      // HTTP ERROR DETECTION
      // ========================================================

      if (
        !bugDetected &&
        !httpSuccess
      ) {
        bugDetected = true;

        bugType = 'HTTP_ERROR';

        bugMessage =
          `API returned HTTP error status ${statusCode}`;
      }

      // ========================================================
      // RESPONSE TIME VALIDATION
      // ========================================================

      if (
        endpoint.maxResponseTime !==
          null &&
        endpoint.maxResponseTime !==
          undefined &&
        responseTime >
          endpoint.maxResponseTime
      ) {
        bugDetected = true;

        if (!bugType) {
          bugType = 'RESPONSE_TIME';

          bugMessage =
            `Response took ${responseTime}ms, ` +
            `maximum allowed is ${endpoint.maxResponseTime}ms`;
        } else {
          bugMessage =
            `${bugMessage}. ` +
            `Response took ${responseTime}ms, ` +
            `maximum allowed is ${endpoint.maxResponseTime}ms`;
        }
      }

      // ========================================================
      // FINAL SUCCESS
      // ========================================================

      const success =
        httpSuccess &&
        !bugDetected;

      // ========================================================
      // SAVE TEST RESULT
      // ========================================================

      const result =
        await this.prisma.testResult.create(
          {
            data: {
              endpointId:
                endpoint.id,

              statusCode,

              responseTime,

              success,

              responseBody:
                response.data,

              bugDetected,

              bugType,

              bugMessage,
            },
          },
        );

      // ========================================================
      // RETURN RESULT
      // ========================================================

      return {
        id: result.id,

        endpointId:
          endpoint.id,

        method:
          endpoint.method,

        url:
          endpoint.url,

        statusCode,

        responseTime,

        expectedStatus:
          endpoint.expectedStatus,

        maxResponseTime:
          endpoint.maxResponseTime,

        success,

        bugDetected,

        bugType,

        bugMessage,

        responseBody:
          response.data,

        createdAt:
          result.createdAt,
      };
    } catch (error) {
      // ========================================================
      // REQUEST ERROR
      // ========================================================

      const responseTime =
        Date.now() - startTime;

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Request failed';

      const result =
        await this.prisma.testResult.create(
          {
            data: {
              endpointId:
                endpoint.id,

              statusCode: null,

              responseTime,

              success: false,

              responseBody:
                Prisma.JsonNull,

              error:
                errorMessage,

              bugDetected: true,

              bugType:
                'REQUEST_ERROR',

              bugMessage:
                errorMessage,
            },
          },
        );

      return {
        id: result.id,

        endpointId:
          endpoint.id,

        method:
          endpoint.method,

        url:
          endpoint.url,

        statusCode: null,

        responseTime,

        expectedStatus:
          endpoint.expectedStatus,

        maxResponseTime:
          endpoint.maxResponseTime,

        success: false,

        bugDetected: true,

        bugType:
          'REQUEST_ERROR',

        bugMessage:
          errorMessage,

        error:
          errorMessage,

        createdAt:
          result.createdAt,
      };
    }
  }

  // ============================================================
  // GET TEST HISTORY
  // ============================================================

  async getResults(
    endpointId: string,
    userId: string,
  ) {
    // Check endpoint ownership
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

    return this.prisma.testResult.findMany({
      where: {
        endpointId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // DELETE ENDPOINT
  // ============================================================

  async remove(
    endpointId: string,
    userId: string,
  ) {
    // ----------------------------------------------------------
    // VERIFY OWNERSHIP
    // ----------------------------------------------------------

    const endpoint =
      await this.prisma.endpoint.findFirst({
        where: {
          id: endpointId,
          project: {
            userId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!endpoint) {
      throw new NotFoundException(
        'Endpoint not found',
      );
    }

    // ----------------------------------------------------------
    // DELETE HISTORY + ENDPOINT
    // IN ONE TRANSACTION
    // ----------------------------------------------------------

    await this.prisma.$transaction(
      async (tx) => {
        await tx.testResult.deleteMany({
          where: {
            endpointId:
              endpoint.id,
          },
        });

        await tx.endpoint.delete({
          where: {
            id: endpoint.id,
          },
        });
      },
    );

    return {
      success: true,

      deletedEndpointId:
        endpoint.id,

      message:
        'Endpoint deleted successfully',
    };
  }

  // ============================================================
  // DELETE INDIVIDUAL TEST RESULT
  // ============================================================

  async removeResult(
    endpointId: string,
    resultId: string,
    userId: string,
  ) {
    // ----------------------------------------------------------
    // VERIFY RESULT BELONGS TO THIS ENDPOINT
    // AND USER OWNS THE PROJECT
    // ----------------------------------------------------------

    const result =
      await this.prisma.testResult.findFirst({
        where: {
          id: resultId,

          endpointId,

          endpoint: {
            project: {
              userId,
            },
          },
        },

        select: {
          id: true,
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Test result not found',
      );
    }

    // ----------------------------------------------------------
    // DELETE RESULT
    // ----------------------------------------------------------

    await this.prisma.testResult.delete({
      where: {
        id: result.id,
      },
    });

    return {
      success: true,

      deletedResultId:
        result.id,

      message:
        'Test result deleted successfully',
    };
  }
}