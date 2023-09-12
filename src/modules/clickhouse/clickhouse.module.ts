import { clickhouseProvider } from './clickhouse.provider';
import { Module, Global } from '@nestjs/common';

@Global()
@Module({})
export class ClickhouseModule {
  static register(logger: any) {
    const dbProvider = clickhouseProvider(logger);
    return {
      module: ClickhouseModule,
      providers: [dbProvider],
      exports: [dbProvider],
    };
  }
}
