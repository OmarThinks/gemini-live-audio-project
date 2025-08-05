import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

console.log(process.env.GOOGLE_API_KEY);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    console.log('Google API Key:', process.env.GOOGLE_API_KEY);

    return this.appService.getHello();
  }
}
