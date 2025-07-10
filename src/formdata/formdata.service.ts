import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FormDataDTO } from './dto/formdata.dto';
import { FormData } from './entities/formdata.entity';
import { TwilioService } from 'src/twilio/twilio.service';

@Injectable()
export class FormdataService {
  constructor(private readonly prismaService: PrismaService, private readonly twilioService: TwilioService){}


  async createformdata(formData: FormDataDTO) {
    
    try {

      const newFormData: FormData = await this.prismaService.contactForm.create({
      data: formData 
      });

      const messageBody = `
📥 *Nuevo Formulario de Contacto* 

👤 *Datos del Contacto*
- *Nombre:* ${formData.nombre}
- *Apellido:* ${formData.apellido}
- *Correo:* ${formData.email}
- *Teléfono:* ${formData.telefono}

🏢 *Datos Laborales*
- *Empresa:* ${formData.empresa}
- *Cargo:* ${formData.cargo}

🌍 *Ubicación*
- *País:* ${formData.pais}
- *Ciudad:* ${formData.ciudad}

📝 *Mensaje*
"${formData.mensaje || 'No incluyó mensaje.'}"

📰 *¿Solicita recibir noticias?* ${formData.recibirNoticias ? 'Sí' : 'No'}
    `.trim();


        await this.twilioService.sendWhatsAppMessage(messageBody)

    

      return newFormData;
      
    } catch (error) {
      
      throw new Error(error.message);

    }

  

  }

}
