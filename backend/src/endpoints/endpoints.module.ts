import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HttpModule,
  ],
  controllers: [EndpointsController],
  providers: [EndpointsService],
})
export class EndpointsModule {}