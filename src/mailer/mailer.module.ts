import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import * as sgTransport from 'nodemailer-sendgrid-transport';


@Module({
  imports: [NestMailerModule.forRoot({

    transport: sgTransport({
      auth: {
        api_key: process.env.SENDGRID_API_KEY,
      }
    }),
    defaults: {
      from: '"Payware contacto" <noresponder@consware.com.co>'
    }

  })],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
