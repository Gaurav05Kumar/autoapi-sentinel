import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EndpointsService } from './endpoints.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('projects/:projectId/endpoints')
@UseGuards(AuthGuard)
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
  ) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name: string;
      method: string;
      url: string;
    },
    @Req() req: any,
  ) {
    return this.endpointsService.create(
      projectId,
      req.user.sub,
      body.name,
      body.method,
      body.url,
    );
  }

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
}
