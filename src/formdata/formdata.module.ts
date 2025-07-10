import { Module } from '@nestjs/common';
import { FormdataService } from './formdata.service';
import { FormdataController } from './formdata.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TwilioService } from 'src/twilio/twilio.service';

@Module({
  controllers: [FormdataController],
  providers: [FormdataService, PrismaService, TwilioService],
})
export class FormdataModule {}
