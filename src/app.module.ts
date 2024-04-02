import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import MiniAPIModule from './modules/miniapi/miniapi.module';

@Module({
  imports: [MiniAPIModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
