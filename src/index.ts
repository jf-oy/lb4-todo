import * as dotenv from 'dotenv';
import * as path from 'path';
import {ApplicationConfig, TodoApplication} from './application';

export * from './application';
export * from './models';
export * from './repositories';

const env = process.env.NODE_ENV ?? 'dev';
const envPath = path.resolve(__dirname, '../', `.env.${env}`);
const result = dotenv.config({path: envPath});
if (result.error) {
  console.error(`Failed to load .env file from ${envPath}:`, result.error);
  throw result.error;
} else {
  console.log('Loaded .env from:', envPath);
}

export async function main(options: ApplicationConfig = {}) {
  const app = new TodoApplication(options);
  await app.boot();
  await app.migrateSchema();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST ?? '127.0.0.1',
      // The `gracePeriodForClose` provides a graceful close for http/https
      // servers with keep-alive clients. The default value is `Infinity`
      // (don't force-close). If you want to immediately destroy all sockets
      // upon stop, set its value to `0`.
      // See https://www.npmjs.com/package/stoppable
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
