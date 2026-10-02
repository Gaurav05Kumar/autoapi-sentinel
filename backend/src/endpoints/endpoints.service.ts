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
  // RESPONSE SCHEMA VALIDATION
  // ============================================================
  //
  // The frontend stores schemas in the project's custom format:
  //
  // {
  //   "phone": "string",
  //   "id": "integer"
  // }
  //
  // Every field in the schema is required. Nested objects and arrays
  // are also supported.
  // ============================================================

  private validateResponseSchema(
    expectedSchema: unknown,
    actualResponse: unknown,
    path = '',
  ): Array<{
    type: string;
    message: string;
  }> {
    const errors: Array<{
      type: string;
      message: string;
    }> = [];

    // ------------------------------------------------------------
    // Expected schema must be an object at the root.
    // ------------------------------------------------------------

    if (
      !expectedSchema ||
      typeof expectedSchema !== 'object' ||
      Array.isArray(expectedSchema)
    ) {
      errors.push({
        type: 'SCHEMA_MISMATCH',
        message:
          'Expected response schema must be a JSON object',
      });

      return errors;
    }

    // ------------------------------------------------------------
    // Root response must be an object when using a field schema.
    // ------------------------------------------------------------

    if (
      !actualResponse ||
      typeof actualResponse !== 'object' ||
      Array.isArray(actualResponse)
    ) {
      errors.push({
        type: 'SCHEMA_MISMATCH',
        message:
          'Expected API response to be an object for schema validation',
      });

      return errors;
    }

    const schema =
      expectedSchema as Record<string, unknown>;

    const response =
      actualResponse as Record<string, unknown>;

    // ------------------------------------------------------------
    // Validate every configured field.
    // Missing fields are bugs.
    // ------------------------------------------------------------

    for (const [field, expectedValue] of Object.entries(schema)) {
      const fieldPath = path
        ? `${path}.${field}`
        : field;

      if (!Object.prototype.hasOwnProperty.call(response, field)) {
        errors.push({
          type: 'MISSING_FIELD',
          message:
            `Required field '${fieldPath}' is missing from response`,
        });

        continue;
      }

      const actualValue = response[field];

      // ----------------------------------------------------------
      // String type
      // ----------------------------------------------------------

      if (expectedValue === 'string') {
        if (typeof actualValue !== 'string') {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type string but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Integer type
      // ----------------------------------------------------------

      if (expectedValue === 'integer') {
        if (
          typeof actualValue !== 'number' ||
          !Number.isInteger(actualValue)
        ) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type integer but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Number type
      // ----------------------------------------------------------

      if (expectedValue === 'number') {
        if (
          typeof actualValue !== 'number' ||
          !Number.isFinite(actualValue)
        ) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type number but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Float type
      // ----------------------------------------------------------
      // JSON does not preserve a separate integer/float type in
      // JavaScript, so both are represented as number.
      // ----------------------------------------------------------

      if (expectedValue === 'float') {
        if (
          typeof actualValue !== 'number' ||
          !Number.isFinite(actualValue)
        ) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type float but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Boolean type
      // ----------------------------------------------------------

      if (expectedValue === 'boolean') {
        if (typeof actualValue !== 'boolean') {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type boolean but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Null type
      // ----------------------------------------------------------

      if (expectedValue === 'null') {
        if (actualValue !== null) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type null but received ${this.getResponseType(actualValue)}`,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Nested object schema
      // ----------------------------------------------------------

      if (
        expectedValue &&
        typeof expectedValue === 'object' &&
        !Array.isArray(expectedValue)
      ) {
        if (
          !actualValue ||
          typeof actualValue !== 'object' ||
          Array.isArray(actualValue)
        ) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type object but received ${this.getResponseType(actualValue)}`,
          });

          continue;
        }

        errors.push(
          ...this.validateResponseSchema(
            expectedValue,
            actualValue,
            fieldPath,
          ),
        );

        continue;
      }

      // ----------------------------------------------------------
      // Array schema
      // ----------------------------------------------------------

      if (Array.isArray(expectedValue)) {
        if (!Array.isArray(actualValue)) {
          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Field '${fieldPath}' expected type array but received ${this.getResponseType(actualValue)}`,
          });

          continue;
        }

        // Empty array means only validate that the response is an array.
        if (expectedValue.length === 0) {
          continue;
        }

        const itemSchema = expectedValue[0];

        actualValue.forEach((item, index) => {
          const itemPath =
            `${fieldPath}[${index}]`;

          // Primitive item type.
          if (typeof itemSchema === 'string') {
            if (
              !this.matchesResponseType(
                item,
                itemSchema,
              )
            ) {
              errors.push({
                type: 'SCHEMA_MISMATCH',
                message:
                  `Field '${itemPath}' expected type ${itemSchema} but received ${this.getResponseType(item)}`,
              });
            }

            return;
          }

          // Nested object item schema.
          if (
            itemSchema &&
            typeof itemSchema === 'object' &&
            !Array.isArray(itemSchema)
          ) {
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              errors.push({
                type: 'SCHEMA_MISMATCH',
                message:
                  `Field '${itemPath}' expected type object but received ${this.getResponseType(item)}`,
              });

              return;
            }

            errors.push(
              ...this.validateResponseSchema(
                itemSchema,
                item,
                itemPath,
              ),
            );

            return;
          }

          errors.push({
            type: 'SCHEMA_MISMATCH',
            message:
              `Unsupported schema definition at '${itemPath}'`,
          });
        });

        continue;
      }

      // ----------------------------------------------------------
      // Unsupported schema definition
      // ----------------------------------------------------------

      errors.push({
        type: 'SCHEMA_MISMATCH',
        message:
          `Unsupported schema definition for field '${fieldPath}'`,
      });
    }

    return errors;
  }

  private matchesResponseType(
    value: unknown,
    expectedType: string,
  ): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';

      case 'integer':
        return (
          typeof value === 'number' &&
          Number.isInteger(value)
        );

      case 'number':
      case 'float':
        return (
          typeof value === 'number' &&
          Number.isFinite(value)
        );

      case 'boolean':
        return typeof value === 'boolean';

      case 'null':
        return value === null;

      case 'object':
        return (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        );

      case 'array':
        return Array.isArray(value);

      default:
        return false;
    }
  }

  private getResponseType(
    value: unknown,
  ): string {
    if (value === null) {
      return 'null';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? 'integer'
        : 'number';
    }

    return typeof value;
  }

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
    expectedResponseSchema?: Prisma.InputJsonValue,
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
        expectedResponseSchema,
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
      // Deterministic validation
      // --------------------------------------------------------
      // If an expected status is configured, the actual status
      // must match it. If no expected status is configured,
      // status-code validation is skipped.
      const httpSuccess =
        endpoint.expectedStatus == null
          ? true
          : statusCode === endpoint.expectedStatus;

      // Start with deterministic checks so the final result does
      // not depend on the AI service being available.
      let bugDetected = false;

      let bugType: string | null =
        null;

      let bugMessage: string | null =
        null;

      // Expected status mismatch is always a real bug.
      if (
        endpoint.expectedStatus != null &&
        statusCode !== endpoint.expectedStatus
      ) {
        bugDetected = true;
        bugType = 'STATUS_CODE';
        bugMessage =
          `Expected status ${endpoint.expectedStatus} but received ${statusCode}`;
      }

      // Response-time limit is also deterministic.
      if (
        endpoint.maxResponseTime != null &&
        responseTime > endpoint.maxResponseTime
      ) {
        bugDetected = true;

        if (!bugType) {
          bugType = 'RESPONSE_TIME';
          bugMessage =
            `Response time ${responseTime}ms exceeded the configured limit of ${endpoint.maxResponseTime}ms`;
        }
      }

      // ========================================================
      // 3. RESPONSE SCHEMA VALIDATION
      // ========================================================
      //
      // Schema validation is deterministic and must not depend on
      // the AI service. This catches missing fields and wrong types
      // even when the AI service is unavailable or returns false.
      // ========================================================

      if (endpoint.expectedResponseSchema != null) {
        const schemaErrors =
          this.validateResponseSchema(
            endpoint.expectedResponseSchema,
            response.data,
          );

        if (schemaErrors.length > 0) {
          bugDetected = true;

          if (!bugType) {
            bugType = schemaErrors[0].type;
          }

          if (!bugMessage) {
            bugMessage = schemaErrors
              .map((error) => error.message)
              .join('. ');
          }
        }
      }

      // ========================================================
      // 4. AI SERVICE ANALYSIS
      // ========================================================

      try {
        // ------------------------------------------------------
        // Send API execution result to AI service
        // ------------------------------------------------------

        const aiResponse =
          await firstValueFrom(
            this.httpService.post(
              `${process.env.AI_SERVICE_URL}/analyze`,
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

                expectedResponseSchema:
  endpoint.expectedResponseSchema,
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

        // AI can detect additional issues such as response-schema,
        // empty-response, or invalid-response problems.
        // Do not allow an AI "false" result to erase a deterministic
        // status-code or response-time bug detected above.
        if (Boolean(aiAnalysis.bugDetected)) {
          bugDetected = true;

          if (!bugType) {
            bugType =
              aiAnalysis.bugType ??
              'AI_DETECTED';
          }

          if (!bugMessage) {
            bugMessage =
              aiAnalysis.message ??
              'AI service detected an API response issue';
          }
        }
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
      // 5. FINAL SUCCESS CALCULATION
      // ========================================================

      const success =
        httpSuccess &&
        !bugDetected;

      // ========================================================
      // 6. SAVE TEST RESULT
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
      // 7. RETURN TEST RESULT
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