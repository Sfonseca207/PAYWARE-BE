import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FormdataService } from './formdata.service';
import { FormDataDTO } from './dto/formdata.dto';

@Controller('formdata')
export class FormdataController {
  constructor(private readonly formdataService: FormdataService) {}


  @Post()
  async createformdata(@Body() formdata: FormDataDTO){

    return await this.formdataService.createformdata(formdata);

  }



}
