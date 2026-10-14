import { Module } from '@nestjs/common';
import { VideoSecurityService } from './video-security.service';
import { VideoSecurityController } from './video-security.controller';

@Module({
  controllers: [VideoSecurityController],
  providers: [VideoSecurityService],
  exports: [VideoSecurityService],
})
export class VideoSecurityModule {}
