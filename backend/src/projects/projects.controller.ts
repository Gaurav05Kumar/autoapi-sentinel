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

import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  create(
    @Body() body: { name: string; description?: string },
    @Req() req: any,
  ) {
    return this.projectsService.create(
      body.name,
      body.description,
      req.user.sub,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.projectsService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.projectsService.findOne(
      id,
      req.user.sub,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.projectsService.remove(
      id,
      req.user.sub,
    );
  }
}