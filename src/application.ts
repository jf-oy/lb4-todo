import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import * as path from 'path';
import {MySequence} from './sequence';
import {TodoService} from './services/todo.service';

export {ApplicationConfig};

export class TodoApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.sequence(MySequence);
    this.static('/', path.join(__dirname, '../public'));

    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.service(TodoService);

    this.projectRoot = __dirname;
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.ts', '.controller.js'], // 支援 .ts 和 .js
        nested: true,
      },
      datasources: {
        dirs: ['datasources'],
        extensions: ['.datasource.ts', '.datasource.js'],
        nested: true,
      },
      repositories: {
        dirs: ['repositories'],
        extensions: ['.repository.ts', '.repository.js'],
        nested: true,
      },
    };
  }
}
