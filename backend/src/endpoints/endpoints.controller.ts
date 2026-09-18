import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EndpointsService } from './endpoints.service';
import { AuthGuard } from '../auth/auth.guard';
import { Prisma } from '../generated/prisma/client';

@Controller('projects/:projectId/endpoints')
@UseGuards(AuthGuard)
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
  ) { }

  // ============================================================
  // CREATE ENDPOINT
  // ============================================================

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name: string;
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: Prisma.InputJsonValue;
      expectedStatus?: number;
      maxResponseTime?: number;
    },
    @Req() req: any,
  ) {
    return this.endpointsService.create(
      projectId,
      req.user.sub,
      body.name,
      body.method,
      body.url,
      body.headers,
      body.body,
      body.expectedStatus,
      body.maxResponseTime,
    );
  }

  // ============================================================
  // GET ALL ENDPOINTS
  // ============================================================

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.findAll(
      projectId,
      req.user.sub,
    );
  }

  // ============================================================
  // RUN ENDPOINT TEST
  // ============================================================

  @Post(':endpointId/run')
  run(
    @Param('endpointId') endpointId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.run(
      endpointId,
      req.user.sub,
    );
  }
  // ============================================================
  // GET PROJECT TEST ANALYTICS
  //
  // URL:
  // GET /projects/:projectId/endpoints/analytics
  // ============================================================

  @Get('analytics')
  getAnalytics(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.getAnalytics(
      projectId,
      req.user.sub,
    );
  }

  // ============================================================
  // GET ENDPOINT TEST HISTORY
  // ============================================================

  @Get(':endpointId/results')
  getResults(
    @Param('endpointId') endpointId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.getResults(
      endpointId,
      req.user.sub,
    );
  }

  // ============================================================
  // DELETE INDIVIDUAL TEST RESULT
  //
  // URL:
  // DELETE /projects/:projectId/endpoints/:endpointId/results/:resultId
  // ============================================================

  @Delete(':endpointId/results/:resultId')
  removeResult(
    @Param('endpointId') endpointId: string,
    @Param('resultId') resultId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.removeResult(
      endpointId,
      resultId,
      req.user.sub,
    );
  }

  // ============================================================
  // DELETE ENDPOINT
  //
  // URL:
  // DELETE /projects/:projectId/endpoints/:endpointId
  // ============================================================

  @Delete(':endpointId')
  remove(
    @Param('endpointId') endpointId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.remove(
      endpointId,
      req.user.sub,
    );
  }
  // ============================================================
  // GET PROJECT TEST ANALYTICS
  // ============================================================

  @Get('analytics')
  getAnalytics(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.endpointsService.getAnalytics(
      projectId,
      req.user.sub,
    );
  }
}