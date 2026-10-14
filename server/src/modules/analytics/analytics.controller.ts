import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackProgressDto } from './dto/track-progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeviceRestrictionGuard } from '../../common/guards/device-restriction.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('watch-progress')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  @HttpCode(HttpStatus.OK)
  async trackProgress(
    @CurrentUser('id') userId: string,
    @Body() dto: TrackProgressDto,
  ) {
    return this.analyticsService.trackProgress(userId, dto);
  }

  @Get('student')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  async getStudentAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getStudentDashboard(userId);
  }

  @Get('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  async getTeacherAnalytics() {
    return this.analyticsService.getTeacherDashboard();
  }

  @Post('reports/generate-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  async generateAllWeeklyReports() {
    return this.analyticsService.generateWeeklyReportsBatch();
  }

  @Post('reports/generate/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  async generateStudentWeeklyReport(@Param('studentId') studentId: string) {
    return this.analyticsService.calculateStudentWeeklyReport(studentId);
  }
}
