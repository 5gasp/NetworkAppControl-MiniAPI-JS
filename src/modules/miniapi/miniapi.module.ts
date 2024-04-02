import { Module } from '@nestjs/common';
import MiniAPIController from './miniapi.controller';
import NEFService from './services/nef.service';
import MiniAPIService from './services/miniapi.service';

@Module({
  controllers: [MiniAPIController],
  providers: [NEFService, MiniAPIService],
})
export default class MiniAPIModule {}
