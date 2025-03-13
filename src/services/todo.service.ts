import {repository} from '@loopback/repository';
import {Todo, TodoStatus} from '../models';
import {ItemRepository, TodoRepository} from '../repositories';

export class TodoService {
  constructor(
    @repository(TodoRepository) private todoRepo: TodoRepository,
    @repository(ItemRepository) private itemRepo: ItemRepository,
  ) {}

  async createTodoWithItems(request: {
    todo: Omit<Todo, 'id' | 'items'>;
    items?: Array<{content: string; isCompleted: boolean}>;
  }): Promise<Todo> {
    // 創建 Todo
    const todo = await this.todoRepo.create({
      ...request.todo,
      status: request.todo.status || TodoStatus.ACTIVE, // 預設為 ACTIVE
    });

    // 如果有 Items，批量創建並關聯到 Todo
    if (request.items && request.items.length > 0) {
      const items = request.items.map(item => ({
        ...item,
        todoId: todo.id!,
      }));
      await this.itemRepo.createAll(items);
    }

    // 返回包含關聯的 Todo
    const todoWithItems = await this.todoRepo.findById(todo.id!, {
      include: ['items'],
    });
    if (!todoWithItems.items) {
      todoWithItems.items = [];
    }
    return todoWithItems;
  }
}
