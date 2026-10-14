import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('students')
  async getStudents(
    @Query('grade') grade?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllStudents(grade, search);
  }

  @Post('students')
  @HttpCode(HttpStatus.CREATED)
  async createStudent(@Body() dto: AdminCreateUserDto) {
    return this.usersService.adminCreateUser(dto);
  }

  @Patch('students/:id/approve')
  async approveStudent(@Param('id') id: string) {
    return this.usersService.approveStudent(id);
  }

  @Patch('students/:id/toggle-block')
  async toggleBlockStudent(@Param('id') id: string) {
    return this.usersService.toggleBlockStudent(id);
  }

  @Post('students/:id/reset-device')
  @HttpCode(HttpStatus.OK)
  async resetStudentDevice(@Param('id') id: string) {
    return this.usersService.resetStudentDevice(id);
  }

  @Delete('students/:id')
  @Roles(Role.ADMIN)
  async deleteStudent(@Param('id') id: string) {
    return this.usersService.deleteStudent(id);
  }
}
