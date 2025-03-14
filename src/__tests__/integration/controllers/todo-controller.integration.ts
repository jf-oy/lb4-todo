import {
  Client,
  TestSandbox,
  createRestAppClient,
  expect,
} from '@loopback/testlab';
import {resolve} from 'path';
import {TodoApplication} from '../../../application';
import {Todo, TodoStatus} from '../../../models';
import {TodoRepository} from '../../../repositories';

describe('TodoController Integration Tests', () => {
  let app: TodoApplication;
  let client: Client;
  let todoRepo: TodoRepository;
  const sandbox = new TestSandbox(resolve(__dirname, '../../.sandbox'));

  beforeEach(async () => {
    await sandbox.reset();

    app = new TodoApplication({
      rest: {
        port: 0,
        host: '127.0.0.1',
      },
    });
    await app.boot();
    await app.start();
    await app.migrateSchema({
      existingSchema: 'drop',
      models: ['Todo', 'Item'],
    });
    todoRepo = await app.get<TodoRepository>('repositories.TodoRepository');
    client = createRestAppClient(app);
  });

  afterEach(async () => {
    await app.stop();
  });

  describe('GET /todos', () => {
    beforeEach(async () => {
      await todoRepo.createAll([
        {
          title: 'Todo 1',
          subtitle: 'First todo',
          status: TodoStatus.ACTIVE,
          createdAt: new Date('2025-03-14T10:00:00Z'),
        },
        {
          title: 'Todo 2',
          subtitle: 'Second todo',
          status: TodoStatus.ACTIVE,
          createdAt: new Date('2025-03-14T11:00:00Z'),
        },
        {
          title: 'Todo 3',
          subtitle: 'Third todo',
          status: TodoStatus.INACTIVE,
          createdAt: new Date('2025-03-14T12:00:00Z'),
        },
      ]);

      await todoRepo.items(1).create({content: 'Item 1', isCompleted: false});
      await todoRepo.items(1).create({content: 'Item 2', isCompleted: true});
      await todoRepo.items(2).create({content: 'Item 3', isCompleted: false});
    });

    it('correctly applies filter with pagination and includes items', async () => {
      const filter = {
        where: {status: 'ACTIVE'},
        include: [{relation: 'items'}],
        order: ['createdAt DESC'],
        limit: 1,
        skip: 0,
        fields: {id: true, title: true, status: true, createdAt: true},
      };

      const response = await client
        .get('/todos')
        .query({filter: JSON.stringify(filter)})
        .expect(200);

      expect(response.body).to.be.an.Array();
      expect(response.body).to.have.length(1);
      expect(response.body[0]).to.containDeep({
        title: 'Todo 2',
        status: 'ACTIVE',
      });
      expect(response.body[0].items).to.have.length(1);
      expect(response.body[0].items[0].content).to.equal('Item 3');
    });

    it('returns all todos when no filter is provided', async () => {
      const response = await client.get('/todos').expect(200);

      expect(response.body).to.be.an.Array();
      expect(response.body).to.have.length(3);

      const todos = response.body as Todo[];
      const todo1 = todos.find(t => t.title === 'Todo 1');
      const todo2 = todos.find(t => t.title === 'Todo 2');
      const todo3 = todos.find(t => t.title === 'Todo 3');

      expect(todo1).to.be.ok();
      if (!todo1?.items) throw new Error('Todo 1 items is undefined or null');
      expect(todo1.items).to.be.an.Array().and.to.have.length(2);
      expect(todo2).to.be.ok();
      if (!todo2?.items) throw new Error('Todo 2 items is undefined or null');
      expect(todo2.items).to.be.an.Array().and.to.have.length(1);
      expect(todo3).to.be.ok();
      expect(todo3!.items).to.be.undefined();
    });

    it('取得所有 Todo 列表', async () => {
      const response = await client.get('/todos').expect(200);

      expect(response.body).to.be.an.Array();
      expect(response.body).to.have.length(3);

      const todos = response.body as Todo[];
      const todo1 = todos.find(t => t.id === 1);
      const todo2 = todos.find(t => t.id === 2);

      expect(todo1).to.be.ok();
      expect(todo1!.items).to.have.length(2);
      expect(todo2).to.be.ok();
      expect(todo2!.items).to.have.length(1);
    });

    it('支援分頁和篩選', async () => {
      await todoRepo.deleteAll();
      const todosData = Array.from({length: 20}, (_, index) => {
        const hours = String((10 + index) % 24).padStart(2, '0');
        return {
          title: `Todo ${index + 1}`,
          subtitle: `Todo ${index + 1}`,
          status: index % 2 === 0 ? TodoStatus.ACTIVE : TodoStatus.INACTIVE,
          createdAt: new Date(`2025-03-14T${hours}:00:00Z`),
        };
      });
      await todoRepo.createAll(todosData);

      for (let i = 1; i <= 20; i++) {
        await todoRepo.items(i).create({
          content: `Item ${i * 2 - 1}`,
          isCompleted: false,
        });
        await todoRepo.items(i).create({
          content: `Item ${i * 2}`,
          isCompleted: true,
        });
      }

      const filter = {
        limit: 5,
        skip: 0,
        where: {status: TodoStatus.ACTIVE},
        order: ['createdAt DESC'],
        include: [{relation: 'items'}],
      };

      const response = await client
        .get('/todos')
        .query({filter: JSON.stringify(filter)})
        .expect(200);

      expect(response.body).to.have.length(5);
      response.body.forEach((todo: Todo) => {
        expect(todo.status).to.equal(TodoStatus.ACTIVE);
        expect(todo.items).to.have.length(2);
      });
    });

    it('支援自定義 include 關係', async () => {
      const filter = {
        include: [
          {
            relation: 'items',
            scope: {
              where: {isCompleted: true},
            },
          },
        ],
      };

      const response = await client
        .get('/todos')
        .query({filter: JSON.stringify(filter)})
        .expect(200);

      expect(response.body).to.be.an.Array();
      expect(response.body).to.have.length(3);

      const todo1 = response.body.find((t: Todo) => t.id === 1);
      expect(todo1.items).to.have.length(1);
      expect(todo1.items[0].isCompleted).to.be.true();
      expect(todo1.items[0].content).to.equal('Item 2');
    });
  });

  describe('GET /todos/{id}', () => {
    beforeEach(async () => {
      await todoRepo.createAll([
        {
          title: 'Todo 1',
          subtitle: 'First todo',
          status: TodoStatus.ACTIVE,
          createdAt: new Date('2025-03-14T10:00:00Z'),
        },
        {
          title: 'Todo 2',
          subtitle: 'Second todo',
          status: TodoStatus.ACTIVE,
          createdAt: new Date('2025-03-14T11:00:00Z'),
        },
      ]);

      await todoRepo.items(1).create({content: 'Item 1-1', isCompleted: false});
      await todoRepo.items(1).create({content: 'Item 1-2', isCompleted: true});
      await todoRepo.items(1).create({content: 'Item 1-3', isCompleted: false});
      await todoRepo.items(2).create({content: 'Item 2-1', isCompleted: true});
      await todoRepo.items(2).create({content: 'Item 2-2', isCompleted: false});
    });

    it('returns a todo with items having different isCompleted states', async () => {
      const response = await client.get('/todos/1').expect(200);

      expect(response.body.id).to.equal(1);
      expect(response.body.title).to.equal('Todo 1');
      expect(response.body.subtitle).to.equal('First todo');
      expect(response.body.status).to.equal(TodoStatus.ACTIVE);
      expect(response.body.items).to.containDeep([
        {content: 'Item 1-1', isCompleted: false},
        {content: 'Item 1-2', isCompleted: true},
        {content: 'Item 1-3', isCompleted: false},
      ]);

      const completedItems = response.body.items.filter(
        (item: {isCompleted: boolean}) => item.isCompleted === true,
      );
      expect(completedItems).to.have.length(1);
      expect(completedItems[0].content).to.equal('Item 1-2');

      const incompleteItems = response.body.items.filter(
        (item: {isCompleted: boolean}) => item.isCompleted === false,
      );
      expect(incompleteItems).to.have.length(2);
      expect(incompleteItems).to.containDeep([
        {content: 'Item 1-1'},
        {content: 'Item 1-3'},
      ]);
    });

    it('returns a todo with only completed items when filtered', async () => {
      const filter = {
        include: [
          {
            relation: 'items',
            scope: {
              where: {isCompleted: true},
            },
          },
        ],
      };

      const response = await client
        .get('/todos/1')
        .query({filter: JSON.stringify(filter)})
        .expect(200);

      expect(response.body.id).to.equal(1);
      expect(response.body.title).to.equal('Todo 1');
      expect(response.body.subtitle).to.equal('First todo');
      expect(response.body.status).to.equal(TodoStatus.ACTIVE);
      expect(response.body.items).to.containDeep([
        {content: 'Item 1-2', isCompleted: true},
      ]);

      const allCompleted = response.body.items.every(
        (item: {isCompleted: boolean}) => item.isCompleted === true,
      );
      expect(allCompleted).to.be.true();
    });

    it('取得單一 Todo 包含其 Items', async () => {
      const response = await client.get('/todos/1').expect(200);

      expect(response.body.id).to.equal(1);
      expect(response.body.title).to.equal('Todo 1');
      expect(response.body.status).to.equal(TodoStatus.ACTIVE);
      expect(response.body.items).to.have.length(3);
    });
  });

  describe('POST /todos', () => {
    it('creates a Todo without items', async () => {
      const request = {
        todo: {
          title: 'New Todo',
          subtitle: 'No items',
          status: TodoStatus.ACTIVE,
        },
      };

      const response = await client.post('/todos').send(request).expect(200);

      expect(response.body).to.containDeep({
        title: 'New Todo',
        subtitle: 'No items',
        status: TodoStatus.ACTIVE,
        items: [],
      });
      expect(response.body.id).to.be.Number();

      const foundTodo = await todoRepo.findById(response.body.id);
      expect(foundTodo).to.containDeep({
        title: 'New Todo',
        subtitle: 'No items',
        status: TodoStatus.ACTIVE,
      });
      const items = await todoRepo.items(response.body.id).find();
      expect(items).to.be.empty();
    });

    it('creates a Todo with items', async () => {
      const request = {
        todo: {
          title: 'New Todo with Items',
          subtitle: 'With items',
          status: TodoStatus.ACTIVE,
        },
        items: [
          {content: 'Item 1', isCompleted: false},
          {content: 'Item 2', isCompleted: true},
        ],
      };

      const response = await client.post('/todos').send(request).expect(200);

      expect(response.body).to.containDeep({
        title: 'New Todo with Items',
        subtitle: 'With items',
        status: TodoStatus.ACTIVE,
      });
      expect(response.body.id).to.be.Number();
      expect(response.body.items).to.have.length(2);
      expect(response.body.items).to.containDeep([
        {content: 'Item 1', isCompleted: false},
        {content: 'Item 2', isCompleted: true},
      ]);

      const foundTodo = await todoRepo.findById(response.body.id);
      expect(foundTodo).to.containDeep({
        title: 'New Todo with Items',
        subtitle: 'With items',
        status: TodoStatus.ACTIVE,
      });
      const items = await todoRepo.items(response.body.id).find();
      expect(items).to.have.length(2);
    });

    it('創建 Todo 及其 Items', async () => {
      const request = {
        todo: {
          title: 'New Todo',
          status: TodoStatus.ACTIVE,
        },
        items: [
          {content: 'item 1', isCompleted: false},
          {content: 'item 2', isCompleted: true},
        ],
      };

      const response = await client.post('/todos').send(request).expect(200);

      expect(response.body.title).to.equal('New Todo');
      expect(response.body.status).to.equal(TodoStatus.ACTIVE);
      expect(response.body.items).to.have.length(2);
      expect(response.body.items).to.containDeep([
        {content: 'item 1', isCompleted: false},
        {content: 'item 2', isCompleted: true},
      ]);
    });
  });

  describe('PATCH /todos/{id}', () => {
    // 改為 PATCH
    beforeEach(async () => {
      await todoRepo.createAll([
        {
          title: 'Todo 1',
          subtitle: 'First todo',
          status: TodoStatus.ACTIVE,
          createdAt: new Date('2025-03-14T10:00:00Z'),
        },
      ]);
      await todoRepo.items(1).create({content: 'Item 1', isCompleted: false});
      await todoRepo.items(1).create({content: 'Item 2', isCompleted: true});

      const todo = await todoRepo.findById(1);
      expect(todo).to.be.ok();
    });

    it('更新 Todo', async () => {
      const updateData = {
        title: 'Updated Todo',
        status: TodoStatus.INACTIVE,
      };

      await client.patch('/todos/1').send(updateData).expect(204);

      const updatedTodo = await todoRepo.findById(1);
      expect(updatedTodo.title).to.equal('Updated Todo');
      expect(updatedTodo.status).to.equal(TodoStatus.INACTIVE);
    });

    it('更新 Todo 時保留原有資料', async () => {
      const partialUpdate = {
        status: TodoStatus.INACTIVE,
      };

      await client.patch('/todos/1').send(partialUpdate).expect(204);

      const updatedTodo = await todoRepo.findById(1);
      expect(updatedTodo.title).to.equal('Todo 1');
      expect(updatedTodo.status).to.equal(TodoStatus.INACTIVE);
      const items = await todoRepo.items(1).find();
      expect(items).to.have.length(2);
    });
  });

  describe('DELETE /todos/{id}', () => {
    beforeEach(async () => {
      await todoRepo.create({
        title: 'Todo 1',
        subtitle: 'First todo',
        status: TodoStatus.ACTIVE,
        createdAt: new Date('2025-03-14T10:00:00Z'),
      });
    });

    it('軟刪除 Todo', async () => {
      await client.delete('/todos/1').expect(204);

      const deletedTodo = await todoRepo.findById(1);
      expect(deletedTodo.status).to.equal(TodoStatus.DELETED);
    });
  });
});
