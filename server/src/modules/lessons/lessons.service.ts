import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { ERROR_CODES } from '../../common/constants';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CHAPTERS
  // ---------------------------------------------------------------------------
  async createChapter(dto: CreateChapterDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('الكورس المحدد غير موجود');
    }

    const chapter = await this.prisma.chapter.create({
      data: {
        title: dto.title.trim(),
        order: dto.order || 1,
        courseId: dto.courseId,
      },
    });

    return {
      message: 'تم إنشاء الفصل الدراسي بنجاح',
      chapter,
    };
  }

  async deleteChapter(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException('الفصل المحدد غير موجود');
    }

    await this.prisma.chapter.delete({
      where: { id: chapterId },
    });

    return {
      message: 'تم حذف الفصل الدراسي بنجاح',
    };
  }

  // ---------------------------------------------------------------------------
  // LESSONS
  // ---------------------------------------------------------------------------
  private get lessonModel(): any {
    return (this.prisma as any).lesson || (this.prisma as any).lecture;
  }

  async createLesson(dto: CreateLessonDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
    });

    if (!chapter) {
      throw new NotFoundException('الفصل الدراسي المحدد غير موجود');
    }

    const lesson = await this.lessonModel.create({
      data: {
        title: dto.title.trim(),
        videoUrl: dto.videoUrl.trim(),
        duration: dto.duration?.trim() || '00:00',
        durationSeconds: dto.durationSeconds || 0,
        order: dto.order || 1,
        isFree: dto.isFree || false,
        chapterId: dto.chapterId,
      },
    });

    return {
      message: 'تم إنشاء المحاضرة بنجاح',
      lesson,
    };
  }

  /**
   * Retrieves lesson info after checking student authorization & course enrollment.
   */
  async getLesson(lessonId: string, user: AuthenticatedUser) {
    const lesson = await this.lessonModel.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('المحاضرة المحددة غير موجودة');
    }

    // Free preview lesson bypasses enrollment requirement
    if (lesson.isFree) {
      return lesson;
    }

    // Admins and Teachers have full access
    if (user.role === Role.ADMIN || user.role === Role.TEACHER) {
      return lesson;
    }

    // Verify student enrollment in the course
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: lesson.chapter.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException({
        message: 'غير مصرح: يجب تفعيل واشتراك الكورس أولاً لمشاهدة هذا الدرس.',
        errorCode: ERROR_CODES.COURSE_NOT_ENROLLED,
      });
    }

    return lesson;
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.lessonModel.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('المحاضرة المحددة غير موجودة');
    }

    await this.lessonModel.delete({
      where: { id: lessonId },
    });

    return {
      message: 'تم حذف المحاضرة بنجاح',
    };
  }

  // ---------------------------------------------------------------------------
  // HOMEWORKS
  // ---------------------------------------------------------------------------
  async createHomework(dto: CreateHomeworkDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
    });

    if (!chapter) {
      throw new NotFoundException('الفصل الدراسي المحدد غير موجود');
    }

    const homework = await this.prisma.homework.create({
      data: {
        title: dto.title.trim(),
        pdfUrl: dto.pdfUrl.trim(),
        chapterId: dto.chapterId,
      },
    });

    return {
      message: 'تم إضافة ملف الواجب بنجاح',
      homework,
    };
  }

  async deleteHomework(homeworkId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });

    if (!homework) {
      throw new NotFoundException('ملف الواجب غير موجود');
    }

    await this.prisma.homework.delete({
      where: { id: homeworkId },
    });

    return {
      message: 'تم حذف ملف الواجب بنجاح',
    };
  }
}
