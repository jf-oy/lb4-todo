import {createStubInstance, expect, sinon} from '@loopback/testlab';
import {TodoController} from '../../../controllers/todo.controller';
import {Item, Todo, TodoStatus} from '../../../models';
import {TodoRepository} from '../../../repositories';
import {TodoService} from '../../../services/todo.service';
import {givenTodo} from '../../helpers';

function logTestOutput(message: string, data: unknown) {
  process.stdout.write(`\n${message}\n${JSON.stringify(data, null, 2)}\n`);
}

describe('TodoController', () => {
  let todoController: TodoController;
  let todoRepository: TodoRepository;
  let todoService: TodoService;

  beforeEach(givenMockedRepository);
  beforeEach(givenMockedService);
  beforeEach(givenController);

  describe('getTodos()', () => {
    it('取得所有 Todo 列表', async () => {
      const items = [
        new Item({id: 1, content: 'item 1', isCompleted: false}),
        new Item({id: 2, content: 'item 2', isCompleted: true}),
      ];

      const todos = [
        givenTodo({
          id: 1,
          title: 'todo 1',
          status: TodoStatus.ACTIVE,
          items,
        }),
        givenTodo({
          id: 2,
          title: 'todo 2',
          status: TodoStatus.INACTIVE,
          items: [],
        }),
      ];

      (todoRepository.find as sinon.SinonStub).resolves(todos);

      const response = await todoController.find();
      logTestOutput('取得所有 Todo 列表的回應：', response);

      expect(response).to.eql(todos);
      expect(response[0].items).to.have.length(2);
      expect(response[1].items).to.have.length(0);
      expect(
        (todoRepository.find as sinon.SinonStub).calledWith({
          include: [{relation: 'items'}],
        }),
      ).to.be.true();
    });

    it('支援分頁和篩選', async () => {
      // 準備測試資料：20 筆待辦事項，狀態交替
      const allTodos = Array.from({length: 20}, (_, index) =>
        givenTodo({
          id: index + 1,
          title: `todo ${index + 1}`,
          status: index % 2 === 0 ? TodoStatus.ACTIVE : TodoStatus.INACTIVE,
          items: [
            new Item({
              id: index * 2 + 1,
              content: `item ${index * 2 + 1}`,
              isCompleted: false,
              todoId: index + 1,
            }),
            new Item({
              id: index * 2 + 2,
              content: `item ${index * 2 + 2}`,
              isCompleted: true,
              todoId: index + 1,
            }),
          ],
        }),
      );

      // 篩選出前 5 筆 ACTIVE 的待辦事項
      const filter = {
        limit: 5,
        skip: 0,
        where: {
          status: TodoStatus.ACTIVE,
        },
        order: ['createdAt DESC'],
      };

      // 預期結果：5 筆 ACTIVE 的待辦事項
      const expectedTodos = allTodos
        .filter(todo => todo.status === TodoStatus.ACTIVE)
        .slice(0, 5);

      // 模擬 repository 回應
      (todoRepository.find as sinon.SinonStub).resolves(expectedTodos);

      const response = await todoController.find(filter);
      logTestOutput('分頁和篩選的回應：', response);

      // 驗證回應內容
      expect(response).to.have.length(5);
      expect(response).to.eql(expectedTodos);
      response.forEach(todo => {
        expect(todo.status).to.equal(TodoStatus.ACTIVE);
        expect(todo.items).to.have.length(2);
      });

      // 驗證呼叫參數
      expect(
        (todoRepository.find as sinon.SinonStub).calledWith({
          ...filter,
          include: [{relation: 'items'}],
        }),
      ).to.be.true();
    });

    it('支援自定義 include 關係', async () => {
      // 準備測試資料
      const todo = givenTodo({
        id: 1,
        title: 'todo with completed items',
        status: TodoStatus.ACTIVE,
        items: [
          new Item({
            id: 1,
            content: 'completed item',
            isCompleted: true,
            todoId: 1,
            completedAt: new Date(),
          }),
          new Item({
            id: 2,
            content: 'incomplete item',
            isCompleted: false,
            todoId: 1,
          }),
        ],
      });

      // 設定篩選條件：只要已完成的項目
      const filter = {
        include: [
          {
            relation: 'items',
            scope: {
              where: {
                isCompleted: true,
              },
            },
          },
        ],
      };

      // 預期結果：todo 中只包含已完成的項目
      const expectedTodo = {
        ...todo,
        items: todo.items.filter(item => item.isCompleted),
      };

      // 模擬 repository 回應
      (todoRepository.find as sinon.SinonStub).resolves([expectedTodo]);

      const response = await todoController.find(filter);
      logTestOutput('自定義 include 關係的回應：', response);

      // 驗證回應內容
      expect(response).to.have.length(1);
      expect(response[0].items).to.have.length(1);
      expect(response[0].items[0].isCompleted).to.be.true();

      // 驗證呼叫參數
      expect(
        (todoRepository.find as sinon.SinonStub).calledWith({
          include: [
            {
              relation: 'items',
              scope: {
                where: {
                  isCompleted: true,
                },
              },
            },
          ],
        }),
      ).to.be.true();
    });
  });

  describe('getTodoById()', () => {
    it('取得單一 Todo 包含其 Items', async () => {
      const todo = givenTodo({
        id: 1,
        title: 'todo with items',
        status: TodoStatus.ACTIVE,
        items: [
          new Item({id: 1, content: 'item 1', isCompleted: false}),
          new Item({id: 2, content: 'item 2', isCompleted: true}),
        ],
      });

      (todoRepository.findById as sinon.SinonStub).resolves(todo);

      const response = await todoController.findById(1);
      logTestOutput('取得單一 Todo 的回應：', response);

      expect(response).to.eql(todo);
      expect(response.items).to.have.length(2);
      expect(
        (todoRepository.findById as sinon.SinonStub).calledWith(1),
      ).to.be.true();
    });
  });

  describe('createTodo()', () => {
    it('創建 Todo 及其 Items', async () => {
      const todo = givenTodo({
        id: 1,
        title: 'new todo',
        status: TodoStatus.ACTIVE,
        items: [
          new Item({id: 1, content: 'item 1', isCompleted: false}),
          new Item({id: 2, content: 'item 2', isCompleted: true}),
        ],
      });

      const request = {
        todo: new Todo({
          title: 'new todo',
          status: TodoStatus.ACTIVE,
        }),
        items: [
          new Item({content: 'item 1', isCompleted: false}),
          new Item({content: 'item 2', isCompleted: true}),
        ],
      };

      (todoService.createTodoWithItems as sinon.SinonStub).resolves(todo);

      const response = await todoController.create(request);
      logTestOutput('創建 Todo 的回應：', response);

      expect(response).to.eql(todo);
      expect(response.items).to.have.length(2);
      expect(
        (todoService.createTodoWithItems as sinon.SinonStub).calledWith(
          request,
        ),
      ).to.be.true();
    });
  });

  describe('updateTodo()', () => {
    it('更新 Todo', async () => {
      // 要更新的資料
      const updateData = new Todo({
        title: 'updated todo',
        status: TodoStatus.INACTIVE,
      });

      // 模擬 updateById 成功
      (todoRepository.updateById as sinon.SinonStub).resolves();

      // 執行更新操作
      await todoController.updateById(1, updateData);

      logTestOutput('更新資料：', updateData);

      // 驗證是否正確呼叫 repository 的 updateById 方法
      expect(
        (todoRepository.updateById as sinon.SinonStub).calledWith(
          1,
          updateData,
        ),
      ).to.be.true();
    });

    it('更新 Todo 時保留原有資料', async () => {
      // 原始的 todo
      const originalTodo = givenTodo({
        id: 1,
        title: 'original todo',
        status: TodoStatus.ACTIVE,
        items: [
          new Item({id: 1, content: 'item 1', isCompleted: false}),
          new Item({id: 2, content: 'item 2', isCompleted: true}),
        ],
      });

      // 部分更新的資料
      const partialUpdate = new Todo({
        status: TodoStatus.INACTIVE,
      });

      // 模擬 updateById 成功
      (todoRepository.updateById as sinon.SinonStub).resolves();

      logTestOutput('原始 Todo：', originalTodo);
      logTestOutput('部分更新資料：', partialUpdate);

      // 執行更新操作
      await todoController.updateById(1, partialUpdate);

      // 驗證是否正確呼叫 repository 的 updateById 方法
      expect(
        (todoRepository.updateById as sinon.SinonStub).calledWith(
          1,
          partialUpdate,
        ),
      ).to.be.true();
    });
  });

  describe('deleteTodo()', () => {
    it('軟刪除 Todo', async () => {
      await todoController.deleteById(1);
      logTestOutput('軟刪除 Todo 的請求內容：', {status: TodoStatus.DELETED});

      expect(
        (todoRepository.updateById as sinon.SinonStub).calledWith(1, {
          status: TodoStatus.DELETED,
        }),
      ).to.be.true();
    });
  });

  function givenMockedRepository() {
    todoRepository = createStubInstance(TodoRepository);
  }

  function givenMockedService() {
    todoService = createStubInstance(TodoService);
  }

  function givenController() {
    todoController = new TodoController(todoRepository, todoService);
  }
});
