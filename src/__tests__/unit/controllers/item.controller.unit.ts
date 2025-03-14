import {createStubInstance, expect, sinon} from '@loopback/testlab';
import {ItemController} from '../../../controllers/item.controller';
import {Item} from '../../../models';
import {ItemRepository} from '../../../repositories';

function logTestOutput(message: string, data: unknown) {
  process.stdout.write(`\n${message}\n${JSON.stringify(data, null, 2)}\n`);
}

describe('ItemController', () => {
  let itemController: ItemController;
  let itemRepository: ItemRepository;

  beforeEach(givenMockedRepository);
  beforeEach(givenController);

  describe('getItems()', () => {
    it('取得特定 Todo 的所有 Items', async () => {
      const items = [
        new Item({content: 'item 1', isCompleted: false}),
        new Item({content: 'item 2', isCompleted: true}),
      ];

      (itemRepository.find as sinon.SinonStub).resolves(items);

      const todoId = 1;
      const response = await itemController.find(todoId);
      logTestOutput('取得特定 Todo 的所有 Items 回應：', response);

      expect(response).to.eql(items);
      expect(
        (itemRepository.find as sinon.SinonStub).calledWith({
          where: {todoId},
        }),
      ).to.be.true();
    });

    it('支援篩選', async () => {
      const todoId = 1;
      // 準備測試資料：包含完成和未完成的項目
      const allItems = [
        new Item({
          id: 1,
          content: 'completed item 1',
          isCompleted: true,
          completedAt: new Date('2024-03-20'),
          todoId,
        }),
        new Item({
          id: 2,
          content: 'incomplete item',
          isCompleted: false,
          todoId,
        }),
        new Item({
          id: 3,
          content: 'completed item 2',
          isCompleted: true,
          completedAt: new Date('2024-03-21'),
          todoId,
        }),
      ];

      // 篩選條件：只要已完成的項目
      const filter = {
        where: {
          isCompleted: true,
        },
        order: ['completedAt DESC'],
      };

      // 預期結果：只有已完成的項目
      const expectedItems = allItems.filter(item => item.isCompleted);

      // 模擬 repository 回應
      (itemRepository.find as sinon.SinonStub).resolves(expectedItems);

      const response = await itemController.find(todoId, filter);

      // 輸出測試資料
      logTestOutput('所有項目：', allItems);
      logTestOutput('篩選條件：', {
        ...filter,
        where: {
          ...filter.where,
          todoId,
        },
      });
      logTestOutput('篩選後的項目：', response);

      // 驗證回應內容
      expect(response).to.have.length(2);
      response.forEach(item => {
        expect(item.isCompleted).to.be.true();
        expect(item.completedAt).to.not.be.undefined();
      });

      // 驗證呼叫參數
      expect(
        (itemRepository.find as sinon.SinonStub).calledWith({
          ...filter,
          where: {
            ...filter.where,
            todoId,
          },
        }),
      ).to.be.true();
    });
  });

  describe('getItemById()', () => {
    it('成功取得單一 Item', async () => {
      const item = new Item({
        id: 1,
        content: 'test item',
        isCompleted: false,
        todoId: 1,
        createdAt: new Date('2024-03-20'),
        updatedAt: new Date('2024-03-21'),
      });

      (itemRepository.findById as sinon.SinonStub).resolves(item);

      const response = await itemController.findById(1);
      logTestOutput('取得單一 Item 的回應：', response);

      expect(response).to.eql(item);
      expect(
        (itemRepository.findById as sinon.SinonStub).calledWith(1),
      ).to.be.true();
    });

    it('當 Item 不存在時應該拋出錯誤', async () => {
      const itemId = 999;
      (itemRepository.findById as sinon.SinonStub).rejects(
        new Error(`Entity not found: Item with id ${itemId}`),
      );

      try {
        await itemController.findById(itemId);
        throw new Error('應該要拋出錯誤');
      } catch (error) {
        logTestOutput('預期的錯誤訊息：', {
          message: error.message,
          code: 'ENTITY_NOT_FOUND',
          statusCode: 404,
        });
        expect(error.message).to.match(/Entity not found/);
      }

      expect(
        (itemRepository.findById as sinon.SinonStub).calledWith(itemId),
      ).to.be.true();
    });
  });

  describe('createItem()', () => {
    it('創建 Item', async () => {
      const todoId = 1;
      const newItem = new Item({
        content: 'new item',
        isCompleted: false,
      });

      const createdItem = new Item({
        id: 1,
        ...newItem,
        todoId,
        createdAt: new Date(),
      });

      (itemRepository.create as sinon.SinonStub).resolves(createdItem);

      const response = await itemController.create(todoId, newItem);
      logTestOutput('創建 Item 的請求內容：', newItem);
      logTestOutput('預期傳給 repository 的資料：', {...newItem, todoId});
      logTestOutput('創建 Item 的回應：', response);

      expect(response).to.eql(createdItem);
      expect(
        (itemRepository.create as sinon.SinonStub).calledWith({
          ...newItem,
          todoId,
        }),
      ).to.be.true();
    });
  });

  describe('updateItem()', () => {
    it('更新 Item', async () => {
      const originalItem = new Item({
        id: 1,
        content: 'original item',
        isCompleted: false,
        todoId: 1,
      });

      const updateData = new Item({
        content: 'updated item',
        isCompleted: true,
        completedAt: new Date(),
      });

      (itemRepository.findById as sinon.SinonStub).resolves(originalItem);
      (itemRepository.updateById as sinon.SinonStub).resolves();

      logTestOutput('原始 Item：', originalItem);
      logTestOutput('更新資料：', updateData);

      await itemController.updateById(1, updateData);

      expect(
        (itemRepository.updateById as sinon.SinonStub).calledWith(
          1,
          updateData,
        ),
      ).to.be.true();
    });
  });

  describe('deleteItem()', () => {
    it('硬刪除 Item', async () => {
      const itemToDelete = new Item({
        id: 1,
        content: 'item to delete',
        isCompleted: false,
        todoId: 1,
      });

      (itemRepository.findById as sinon.SinonStub).resolves(itemToDelete);

      logTestOutput('要刪除的 Item：', itemToDelete);

      await itemController.deleteById(1);

      expect(
        (itemRepository.deleteById as sinon.SinonStub).calledWith(1),
      ).to.be.true();
    });
  });

  function givenMockedRepository() {
    itemRepository = createStubInstance(ItemRepository);
  }

  function givenController() {
    itemController = new ItemController(itemRepository);
  }
});
