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

  // =========================
  // CREATE PROJECT
  // POST /projects
  // =========================
  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
    },
    @Req() req: any,
  ) {
    console.log('========== CREATE PROJECT ==========');
    console.log('User:', req.user);
    console.log('User ID (sub):', req.user?.sub);
    console.log('Project name:', body.name);
    console.log('Project description:', body.description);

    return this.projectsService.create(
      body.name,
      body.description,
      req.user.sub,
    );
  }

  // =========================
  // GET ALL PROJECTS
  // GET /projects
  // =========================
  @Get()
  findAll(@Req() req: any) {
    console.log('========== GET ALL PROJECTS ==========');
    console.log('User:', req.user);
    console.log('User ID (sub):', req.user?.sub);

    return this.projectsService.findAll(
      req.user.sub,
    );
  }

  // =========================
  // GET SINGLE PROJECT
  // GET /projects/:id
  // =========================
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    console.log('========== GET SINGLE PROJECT ==========');
    console.log('Project ID:', id);
    console.log('User:', req.user);
    console.log('User ID (sub):', req.user?.sub);

    return this.projectsService.findOne(
      id,
      req.user.sub,
    );
  }

  // =========================
  // DELETE PROJECT
  // DELETE /projects/:id
  // =========================
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    console.log('========== DELETE PROJECT ==========');
    console.log('Project ID:', id);
    console.log('User:', req.user);
    console.log('User ID (sub):', req.user?.sub);

    return this.projectsService.remove(
      id,
      req.user.sub,
    );
  }
}