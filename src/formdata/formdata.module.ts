import { Module } from '@nestjs/common';
import { FormdataService } from './formdata.service';
import { FormdataController } from './formdata.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { MailerService } from 'src/mailer/mailer.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SecurityValidationPipe } from './pipes/security-validation.pipe';

@Module({
  controllers: [FormdataController],
  providers: [
    FormdataService, 
    PrismaService, 
    TwilioService, 
    MailerService,
    RateLimitGuard,
    SecurityValidationPipe
  ],
})
export class FormdataModule {}
