import {
  Client,
  TestSandbox,
  createRestAppClient,
  expect,
} from '@loopback/testlab';
import {resolve} from 'path';
import {TodoApplication} from '../../../application';
import {TodoStatus} from '../../../models';
import {ItemRepository, TodoRepository} from '../../../repositories';

describe('ItemController Integration Tests', () => {
  let app: TodoApplication;
  let client: Client;
  let todoRepo: TodoRepository;
  let itemRepo: ItemRepository;
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
    itemRepo = await app.get<ItemRepository>('repositories.ItemRepository');
    client = createRestAppClient(app);

    // 預設創建一個 Todo 以供 Item 使用
    await todoRepo.create({
      title: 'Test Todo',
      subtitle: 'For items',
      status: TodoStatus.ACTIVE,
      createdAt: new Date('2025-03-14T10:00:00Z'),
    });
  });

  afterEach(async () => {
    await app.stop();
  });

  describe('GET /items/{id}', () => {
    beforeEach(async () => {
      await itemRepo.create({
        content: 'Test Item',
        isCompleted: false,
        todoId: 1,
        createdAt: new Date('2025-03-14T10:00:00Z'),
      });
    });

    it('取得單一 Item by Id', async () => {
      const response = await client.get('/items/1').expect(200);

      expect(response.body.id).to.equal(1);
      expect(response.body.content).to.equal('Test Item');
      expect(response.body.isCompleted).to.equal(false);
      expect(response.body.todoId).to.equal(1);

      const foundItem = await itemRepo.findById(1);
      expect(foundItem).to.containDeep({
        content: 'Test Item',
        isCompleted: false,
        todoId: 1,
      });
    });

    it('當 Item 不存在時應該返回 404', async () => {
      await client.get('/items/999').expect(404);
    });
  });

  describe('POST /todos/{todoId}/items', () => {
    it('新增 Item', async () => {
      const request = {
        content: 'New Item',
        isCompleted: false,
      };

      const response = await client
        .post('/todos/1/items')
        .send(request)
        .expect(200);

      expect(response.body).to.containDeep({
        content: 'New Item',
        isCompleted: false,
        todoId: 1,
      });
      expect(response.body.id).to.be.Number();

      const foundItem = await itemRepo.findById(response.body.id);
      expect(foundItem).to.containDeep({
        content: 'New Item',
        isCompleted: false,
        todoId: 1,
      });
    });
  });

  describe('PATCH /items/{id}', () => {
    beforeEach(async () => {
      await itemRepo.create({
        content: 'Original Item',
        isCompleted: false,
        todoId: 1,
        createdAt: new Date('2025-03-14T10:00:00Z'),
      });
    });

    it('更新 Item by Id', async () => {
      const updateData = {
        content: 'Updated Item',
        isCompleted: true,
        completedAt: new Date('2025-03-14T11:00:00Z'),
      };

      await client.patch('/items/1').send(updateData).expect(204);

      const updatedItem = await itemRepo.findById(1);
      expect(updatedItem.content).to.equal('Updated Item');
      expect(updatedItem.isCompleted).to.equal(true);
      expect(updatedItem.completedAt).to.not.be.undefined();
    });
  });

  describe('DELETE /items/{id}', () => {
    beforeEach(async () => {
      await itemRepo.create({
        content: 'Item to Delete',
        isCompleted: false,
        todoId: 1,
        createdAt: new Date('2025-03-14T10:00:00Z'),
      });
    });

    it('刪除 Item by Id（硬刪除）', async () => {
      await client.delete('/items/1').expect(204);

      try {
        await itemRepo.findById(1);
        throw new Error('Item 應該已被刪除');
      } catch (error) {
        expect(error.message).to.match(/Entity not found/);
      }
    });
  });
});
