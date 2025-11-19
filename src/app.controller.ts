import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-cache')
  root() {
    return { status: 'ok', service: 'Tradeoff Fashion Marketplace API' };
  }
}
