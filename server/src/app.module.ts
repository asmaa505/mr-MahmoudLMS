import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { VideoSecurityModule } from './modules/video-security/video-security.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),

    // Global Infrastructure Modules
    PrismaModule,
    RedisModule,

    // Core Business Feature Modules
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    VideoSecurityModule,
    ExamsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
