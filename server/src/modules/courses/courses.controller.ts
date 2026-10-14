import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UnlockCourseDto } from './dto/unlock-course.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeviceRestrictionGuard } from '../../common/guards/device-restriction.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getAllCourses(
    @Query('grade') grade?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.coursesService.findAll(grade, user);
  }

  @Get(':id')
  async getCourseById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.coursesService.findOne(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteCourse(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @Post('unlock')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  @HttpCode(HttpStatus.OK)
  async unlockCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: UnlockCourseDto,
  ) {
    return this.coursesService.unlockCourseWithCode(userId, dto.code);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  @HttpCode(HttpStatus.OK)
  async redeemCode(
    @CurrentUser('id') userId: string,
    @Body() dto: UnlockCourseDto,
  ) {
    return this.coursesService.unlockCourseWithCode(userId, dto.code);
  }
}
