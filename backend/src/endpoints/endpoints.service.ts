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
    // ----------------------------------------------------------
    // Check whether the project belongs to the logged-in user
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Create endpoint
    // ----------------------------------------------------------

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
    // ----------------------------------------------------------
    // Check project ownership
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Return project endpoints
    // ----------------------------------------------------------

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
    // ----------------------------------------------------------
    // Check endpoint ownership
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Start timer
    // ----------------------------------------------------------

    const startTime = Date.now();

    try {
      // ========================================================
      // 1. SEND API REQUEST
      // ========================================================

      const response =
        await firstValueFrom(
          this.httpService.request({
            // HTTP method
            method: endpoint.method,

            // API URL
            url: endpoint.url,

            // Optional request headers
            headers:
              endpoint.headers &&
              typeof endpoint.headers === 'object'
                ? (endpoint.headers as Record<
                    string,
                    string
                  >)
                : undefined,

            // Optional request body
            data:
              endpoint.body ??
              undefined,

            // --------------------------------------------------
            // Important:
            // Axios normally throws for 4xx/5xx.
            //
            // We don't want that because AI service should
            // analyze those responses as well.
            // --------------------------------------------------

            validateStatus: () => true,
          }),
        );

      // ========================================================
      // 2. RESPONSE INFORMATION
      // ========================================================

      const responseTime =
        Date.now() - startTime;

      const statusCode =
        response.status;

      // --------------------------------------------------------
      // HTTP success means 200-399
      // --------------------------------------------------------

      const httpSuccess =
        statusCode >= 200 &&
        statusCode < 400;

      // ========================================================
      // 3. AI SERVICE ANALYSIS
      // ========================================================

      let bugDetected = false;

      let bugType: string | null =
        null;

      let bugMessage: string | null =
        null;

      try {
        // ------------------------------------------------------
        // Send API execution result to AI service
        // ------------------------------------------------------

        const aiResponse =
          await firstValueFrom(
            this.httpService.post(
              'http://127.0.0.1:8000/analyze',
              {
                // ------------------------------------------------
                // Request information
                // ------------------------------------------------

                method:
                  endpoint.method,

                url:
                  endpoint.url,

                // ------------------------------------------------
                // Response information
                // ------------------------------------------------

                statusCode,

                responseTime,

                responseBody:
                  response.data,

                // ------------------------------------------------
                // Validation configuration
                // ------------------------------------------------

                expectedStatus:
                  endpoint.expectedStatus,

                maxResponseTime:
                  endpoint.maxResponseTime,
              },
            ),
          );

        // ------------------------------------------------------
        // Get AI analysis
        // ------------------------------------------------------

        const aiAnalysis =
          aiResponse.data;

        // ------------------------------------------------------
        // Store AI result
        // ------------------------------------------------------

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
        // ------------------------------------------------------
        // AI service failure should NOT stop API testing.
        //
        // The API request itself already succeeded.
        // ------------------------------------------------------

        console.error(
          'AI service unavailable:',
          aiError,
        );
      }

      // ========================================================
      // 4. FINAL SUCCESS CALCULATION
      // ========================================================

      const success =
        httpSuccess &&
        !bugDetected;

      // ========================================================
      // 5. SAVE TEST RESULT
      // ========================================================

      const result =
        await this.prisma.testResult.create({
          data: {
            // Endpoint reference
            endpointId:
              endpoint.id,

            // HTTP status
            statusCode,

            // Response time in milliseconds
            responseTime,

            // Final test status
            success,

            // API response
            responseBody:
              response.data,

            // AI bug detection
            bugDetected,

            // AI bug category
            bugType,

            // AI explanation
            bugMessage,
          },
        });

      // ========================================================
      // 6. RETURN TEST RESULT
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

      // --------------------------------------------------------
      // Convert unknown error into readable message
      // --------------------------------------------------------

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Request failed';

      // --------------------------------------------------------
      // Save failed request
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // Return request error result
      // --------------------------------------------------------

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
    // ----------------------------------------------------------
    // Check endpoint ownership
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Return test history
    // ----------------------------------------------------------

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
    // ----------------------------------------------------------
    // Check project ownership
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Get all test results belonging to this project
    // ----------------------------------------------------------

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

    // ==========================================================
    // BASIC STATISTICS
    // ==========================================================

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

    // ==========================================================
    // SUCCESS RATE
    // ==========================================================

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

    // ==========================================================
    // BUG TYPE COUNTS
    // ==========================================================

    const bugTypes: Record<
      string,
      number
    > = {
      STATUS_CODE: 0,
      HTTP_ERROR: 0,
      RESPONSE_TIME: 0,
      EMPTY_RESPONSE: 0,
      INVALID_RESPONSE: 0,
      REQUEST_ERROR: 0,
    };

    // ----------------------------------------------------------
    // Count each bug type
    // ----------------------------------------------------------

    results.forEach(
      (result) => {
        if (!result.bugType) {
          return;
        }

        if (
          result.bugType in
          bugTypes
        ) {
          bugTypes[
            result.bugType
          ]++;
        }
      },
    );

    // ==========================================================
    // RETURN ANALYTICS
    // ==========================================================

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
    // ----------------------------------------------------------
    // Verify endpoint ownership
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
    // Delete history + endpoint
    // ----------------------------------------------------------

    await this.prisma.$transaction(
      async (tx) => {
        // Delete all test results
        await tx.testResult.deleteMany({
          where: {
            endpointId:
              endpoint.id,
          },
        });

        // Delete endpoint
        await tx.endpoint.delete({
          where: {
            id: endpoint.id,
          },
        });
      },
    );

    // ----------------------------------------------------------
    // Return success
    // ----------------------------------------------------------

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
    // Verify:
    //
    // 1. Result belongs to endpoint
    // 2. Endpoint belongs to user's project
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
    // Delete result
    // ----------------------------------------------------------

    await this.prisma.testResult.delete({
      where: {
        id: result.id,
      },
    });

    // ----------------------------------------------------------
    // Return success
    // ----------------------------------------------------------

    return {
      success: true,

      deletedResultId:
        result.id,

      message:
        'Test result deleted successfully',
    };
  }
}