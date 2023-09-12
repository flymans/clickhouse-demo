import { connectUmzugClickhouse } from './clickhouse.migrate';

export const clickhouseProvider = (logger: any) => ({
  provide: 'ClickhouseInstance',
  useFactory: async () => {
    const umzug = await connectUmzugClickhouse({
      host: '127.0.0.1',
      port: 8123,
      config: {
        session_timeout: 60,
      },
      basicAuth: null,
      database: 'demo',
    });

    const pendingMigrations = await umzug.pending();
    if (pendingMigrations.length > 0) {
      logger.error(
        `Please run 'npm run migrate up', there are missing migrations: ${pendingMigrations
          .map(({ file }) => file)
          .join(', ')}`,
      );
    }
    return umzug;
  },
});
