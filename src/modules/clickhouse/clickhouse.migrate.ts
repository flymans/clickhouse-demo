import * as path from 'path';

import * as Umzug from 'umzug';
import { ClickHouse } from 'clickhouse';
import { ClickhouseStorage } from 'umzug-clickhouse-storage';
import { ConsoleLogger } from '@nestjs/common';

export function connectUmzugClickhouse(dbConfig) {
  const clickhouseClient = new ClickHouse(dbConfig);
  return new Umzug({
    migrations: {
      params: [
        {
          query: async (sql) => clickhouseClient.query(sql).toPromise(),
          database: dbConfig.database,
        },
      ],
      path: 'src/migrations',
      pattern: /\.js$/,
    },
    storage: new ClickhouseStorage({ clickhouse: clickhouseClient }),
  });
}

export async function clickhouseMigrate() {
  const logger = new ConsoleLogger();
  const umzug = await connectUmzugClickhouse({
    host: '127.0.0.1',
    port: 8123,
    config: {
      session_timeout: 60,
    },
    basicAuth: null,
    database: 'demo',
  });

  const logUmzugEvent = (eventName) => (name) =>
    logger.verbose(`${name} ${eventName}`);
  umzug.on('migrating', logUmzugEvent('migrating'));
  umzug.on('migrated', logUmzugEvent('migrated'));
  umzug.on('reverting', logUmzugEvent('reverting'));
  umzug.on('reverted', logUmzugEvent('reverted'));

  function cmdStatus() {
    const result: any = {};

    return umzug
      .executed()
      .then((executed) => {
        result.executed = executed;
        return umzug.pending();
      })
      .then((pending) => {
        result.pending = pending;
        return result;
      })
      .then(({ executed, pending }) => {
        executed = executed.map((m) => {
          m.name = path.basename(m.file, '.ts');
          return m;
        });
        pending = pending.map((m) => {
          m.name = path.basename(m.file, '.ts');
          return m;
        });

        const current =
          executed.length > 0 ? executed[0].file : '<NO_MIGRATIONS>';
        const status = {
          current,
          executed: executed.map((m) => m.file),
          pending: pending.map((m) => m.file),
        };

        logger.verbose(status);

        return { executed, pending };
      });
  }

  function cmdMigrate() {
    return umzug.up();
  }

  function cmdMigrateNext() {
    return cmdStatus().then(({ pending }) => {
      if (pending.length === 0) {
        return Promise.reject(new Error('No pending migrations'));
      }
      const next = pending[0].name;
      return umzug.up({ to: next });
    });
  }

  function cmdReset() {
    return umzug.down({ to: 0 });
  }

  function cmdResetPrev() {
    return cmdStatus().then(({ executed }) => {
      if (executed.length === 0) {
        return Promise.reject(new Error('Already at initial state'));
      }
      const prev = executed[executed.length - 1].name;
      return umzug.down({ to: prev });
    });
  }

  const cmd = process.argv[2] ? process.argv[2].trim() : process.argv[2];
  let executedCmd;

  if (cmd) logger.log(`${cmd.toUpperCase()} BEGIN`);
  switch (cmd) {
    case 'status':
      executedCmd = cmdStatus();
      break;

    case 'up':
      executedCmd = cmdMigrate();
      break;

    case 'next':
      executedCmd = cmdMigrateNext();
      break;

    case 'reset':
      executedCmd = cmdReset();
      break;

    case 'prev':
    case 'down':
      executedCmd = cmdResetPrev();
      break;

    default:
      logger.error(`invalid cmd: ${cmd}`);
      process.exit(1);
  }

  executedCmd
    .then(() => {
      const doneStr = `${cmd.toUpperCase()} DONE`;
      logger.log(doneStr);
    })
    .catch((err) => {
      const errorStr = `${cmd.toUpperCase()} ERROR`;
      logger.error(errorStr);
      console.log(err);
    })
    .then(() => {
      if (cmd !== 'status') {
        return cmdStatus();
      }
      return Promise.resolve();
    })
    .then(() => process.exit(0));
}
