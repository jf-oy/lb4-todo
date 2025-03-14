import {expect, TestSandbox} from '@loopback/testlab';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {resolve} from 'path';
import {TodoApplication} from '../../../application';
import {Item, Todo, TodoStatus} from '../../../models';
import {ItemRepository, TodoRepository} from '../../../repositories';
import {TodoService} from '../../../services/todo.service';

const env = process.env.NODE_ENV ?? 'dev';
const envPath = path.resolve(__dirname, '../../../../', `.env.${env}`);
const dotenvResult = dotenv.config({path: envPath});
if (dotenvResult.error) {
  console.error(
    `Failed to load .env file from ${envPath}:`,
    dotenvResult.error,
  );
  throw dotenvResult.error;
} else {
  console.log('Loaded .env from:', envPath);
}

describe('TodoService Integration Tests', () => {
  let app: TodoApplication;
  let todoService: TodoService;
  let todoRepo: TodoRepository;
  let itemRepo: ItemRepository;
  const sandbox = new TestSandbox(resolve(__dirname, '../../../.sandbox'));

  beforeEach(async () => {
    await sandbox.reset();

    app = new TodoApplication({
      rest: {
        port: 0, // 使用隨機端口
        host: '127.0.0.1', // 明確指定 IPv4 地址
      },
    });
    await app.boot();
    await app.migrateSchema({
      existingSchema: 'drop',
      models: ['Todo', 'Item'],
    });
    todoRepo = await app.get<TodoRepository>('repositories.TodoRepository');
    itemRepo = await app.get<ItemRepository>('repositories.ItemRepository');
    todoService = new TodoService(todoRepo, itemRepo);
  });

  afterEach(async () => {
    await app.stop();
  });

  it('creates a Todo without items', async () => {
    const request = {
      todo: {
        title: 'Test Todo',
        subtitle: 'No items',
        status: TodoStatus.ACTIVE,
      } as Omit<Todo, 'id' | 'items'>,
    };

    const createdTodo = await todoService.createTodoWithItems(request);

    expect(createdTodo).to.containDeep({
      title: 'Test Todo',
      subtitle: 'No items',
      status: TodoStatus.ACTIVE,
      items: [],
    });
    expect(createdTodo.id).to.be.Number();

    const foundTodo = await todoRepo.findById(createdTodo.id!);
    expect(foundTodo).to.containDeep({
      title: 'Test Todo',
      subtitle: 'No items',
      status: TodoStatus.ACTIVE,
    });
    const items = await itemRepo.find({where: {todoId: createdTodo.id}});
    expect(items).to.be.empty();
  });

  it('creates a Todo with items', async () => {
    const request = {
      todo: {
        title: 'Test Todo with Items',
        subtitle: 'With items',
        status: TodoStatus.ACTIVE,
      } as Omit<Todo, 'id' | 'items'>,
      items: [
        {content: 'Item 1', isCompleted: false} as Omit<Item, 'id' | 'todoId'>,
        {content: 'Item 2', isCompleted: true} as Omit<Item, 'id' | 'todoId'>,
      ],
    };

    const createdTodo = await todoService.createTodoWithItems(request);

    expect(createdTodo).to.containDeep({
      title: 'Test Todo with Items',
      subtitle: 'With items',
      status: TodoStatus.ACTIVE,
    });
    expect(createdTodo.id).to.be.Number();
    expect(createdTodo.items).to.be.Array();
    expect(createdTodo.items).to.have.length(2);
    expect(createdTodo.items).to.containDeep([
      {content: 'Item 1', isCompleted: false},
      {content: 'Item 2', isCompleted: true},
    ]);

    const foundTodo = await todoRepo.findById(createdTodo.id!);
    expect(foundTodo).to.containDeep({
      title: 'Test Todo with Items',
      subtitle: 'With items',
      status: TodoStatus.ACTIVE,
    });
    const items = await itemRepo.find({where: {todoId: createdTodo.id}});
    expect(items).to.have.length(2);
    expect(items).to.containDeep([
      {content: 'Item 1', isCompleted: false, todoId: createdTodo.id},
      {content: 'Item 2', isCompleted: true, todoId: createdTodo.id},
    ]);
  });

  it('sets default status to ACTIVE when not provided', async () => {
    const request = {
      todo: {
        title: 'Default Status Todo',
        subtitle: 'Test default',
      } as Omit<Todo, 'id' | 'items'>,
    };

    const createdTodo = await todoService.createTodoWithItems(request);

    expect(createdTodo.status).to.equal(TodoStatus.ACTIVE);
    const foundTodo = await todoRepo.findById(createdTodo.id!);
    expect(foundTodo.status).to.equal(TodoStatus.ACTIVE);
  });
});
