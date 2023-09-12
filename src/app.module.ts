import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickhouseModule } from './modules/clickhouse';

@Module({
  imports: [ClickhouseModule.register(new Logger('ClickhouseModule'))],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
