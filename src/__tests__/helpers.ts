import {Todo, TodoStatus} from '../models';

export function givenTodo(todo?: Partial<Todo>) {
  const data = Object.assign(
    {
      title: 'todo default title',
      subtitle: 'todo default subtitle',
      status: TodoStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    todo,
  );
  return new Todo(data);
}
