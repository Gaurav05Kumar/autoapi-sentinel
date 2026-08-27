import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Body() body: { name: string; description?: string },
  ) {
    return this.projectsService.create(
      body.name,
      body.description,
    );
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }
}