import {inject} from '@loopback/core';
import {juggler} from '@loopback/repository';

export class DbDataSource extends juggler.DataSource {
  static dataSourceName = 'db';

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: object = {
      name: 'db',
      connector: 'mysql',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ?? 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    },
  ) {
    super(dsConfig);
  }
}
