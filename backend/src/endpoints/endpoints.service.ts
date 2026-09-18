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
  // RUN ENDPOINT + AI BUG ANALYSIS
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
              typeof endpoint.headers === 'object'
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
      // RESPONSE INFORMATION
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
      // AI SERVICE ANALYSIS
      // --------------------------------------------------------

      let bugDetected = false;

      let bugType: string | null =
        null;

      let bugMessage: string | null =
        null;

      try {
        const aiResponse =
          await firstValueFrom(
            this.httpService.post(
              'http://127.0.0.1:8000/analyze',
              {
                statusCode,
                responseTime,
                responseBody:
                  response.data,
                expectedStatus:
                  endpoint.expectedStatus,
                maxResponseTime:
                  endpoint.maxResponseTime,
              },
            ),
          );

        const aiAnalysis =
          aiResponse.data;

        // Take bug analysis from AI service
        bugDetected =
          Boolean(
            aiAnalysis.bugDetected,
          );

        bugType =
          aiAnalysis.bugType ??
          null;

        bugMessage =
          aiAnalysis.message ??
          null;

      } catch (aiError) {
        // AI service failure should not stop API testing.
        console.error(
          'AI service unavailable:',
          aiError,
        );
      }

      // --------------------------------------------------------
      // HTTP ERROR DETECTION
      // --------------------------------------------------------

      if (
        !bugDetected &&
        !httpSuccess
      ) {
        bugDetected = true;

        bugType = 'HTTP_ERROR';

        bugMessage =
          `API returned HTTP error status ${statusCode}`;
      }

      // --------------------------------------------------------
      // FINAL SUCCESS
      // --------------------------------------------------------

      const success =
        httpSuccess &&
        !bugDetected;

      // --------------------------------------------------------
      // SAVE TEST RESULT
      // --------------------------------------------------------

      const result =
        await this.prisma.testResult.create({
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
        });

      // --------------------------------------------------------
      // RETURN RESULT
      // --------------------------------------------------------

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
        await this.prisma.testResult.create({
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
        });

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
  // GET PROJECT TEST ANALYTICS
  // ============================================================

  async getAnalytics(
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

    // Get all test results
    // belonging to this project
    const results =
      await this.prisma.testResult.findMany({
        where: {
          endpoint: {
            projectId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    // ----------------------------------------------------------
    // BASIC STATISTICS
    // ----------------------------------------------------------

    const totalTests =
      results.length;

    const passedTests =
      results.filter(
        (result) =>
          result.success,
      ).length;

    const failedTests =
      results.filter(
        (result) =>
          !result.success,
      ).length;

    const bugsDetected =
      results.filter(
        (result) =>
          result.bugDetected,
      ).length;

    // ----------------------------------------------------------
    // SUCCESS RATE
    // ----------------------------------------------------------

    const successRate =
      totalTests > 0
        ? Number(
            (
              (passedTests /
                totalTests) *
              100
            ).toFixed(2),
          )
        : 0;

    // ----------------------------------------------------------
    // BUG TYPE COUNTS
    // ----------------------------------------------------------

    const bugTypes = {
      STATUS_CODE: 0,
      HTTP_ERROR: 0,
      RESPONSE_TIME: 0,
      REQUEST_ERROR: 0,
    };

    results.forEach(
      (result) => {
        if (
          result.bugType &&
          result.bugType in
            bugTypes
        ) {
          bugTypes[
            result.bugType as keyof typeof bugTypes
          ]++;
        }
      },
    );

    // ----------------------------------------------------------
    // RETURN ANALYTICS
    // ----------------------------------------------------------

    return {
      projectId,

      totalTests,

      passedTests,

      failedTests,

      bugsDetected,

      successRate,

      bugTypes,
    };
  }

  // ============================================================
  // DELETE ENDPOINT
  // ============================================================

  async remove(
    endpointId: string,
    userId: string,
  ) {
    // Verify ownership
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

    // Delete history + endpoint
    // in one transaction
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
    // Verify result belongs to this endpoint
    // and user owns the project
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

    // Delete result
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