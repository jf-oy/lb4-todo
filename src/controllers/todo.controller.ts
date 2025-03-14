import {service} from '@loopback/core';
import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {Item, Todo, TodoStatus} from '../models';
import {TodoRepository} from '../repositories';
import {TodoService} from '../services/todo.service';
export class TodoController {
  constructor(
    @repository(TodoRepository)
    public todoRepository: TodoRepository,
    @service(TodoService)
    public todoService: TodoService,
  ) {}

  @post('/todos')
  @response(200, {
    description: 'Todo model instance',
    content: {'application/json': {schema: getModelSchemaRef(Todo)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              todo: {
                type: 'object',
                properties: {
                  title: {type: 'string'},
                  subtitle: {type: 'string'},
                  status: {type: 'string', enum: Object.values(TodoStatus)},
                },
                required: ['title'],
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    content: {type: 'string'},
                    isCompleted: {type: 'boolean'},
                    completedAt: {type: 'string', format: 'date-time'},
                  },
                  required: ['content', 'isCompleted'],
                },
              },
            },
            required: ['todo'],
          },
        },
      },
    })
    request: {
      todo: Omit<Todo, 'id' | 'items'>;
      items?: Array<Omit<Item, 'id' | 'todoId'>>;
    },
  ): Promise<Todo> {
    return this.todoService.createTodoWithItems(request);
  }

  @get('/todos')
  @response(200, {
    description: 'Array of Todo model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Todo, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Todo)
    filter?: Filter<Todo>,
  ): Promise<Todo[]> {
    // console.log('Raw Filter:', JSON.stringify(filter)); // 檢查原始 filter
    const mergedFilter: Filter<Todo> = {
      ...filter,
      include: filter?.include ?? [{relation: 'items'}],
    };
    // console.log('Merged Filter:', JSON.stringify(mergedFilter));
    return this.todoRepository.find(mergedFilter);
  }

  @get('/todos/{id}')
  @response(200, {
    description: 'Todo model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Todo, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Todo, {exclude: 'where'}) filter?: FilterExcludingWhere<Todo>,
  ): Promise<Todo> {
    // console.log('Raw Filter:', JSON.stringify(filter));
    const mergedFilter = {
      ...filter,
      include: filter?.include ?? [{relation: 'items'}],
    };
    // console.log('Merged Filter:', JSON.stringify(mergedFilter));
    return this.todoRepository.findById(id, mergedFilter);
  }

  @patch('/todos/{id}')
  @response(204, {
    description: 'Todo PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: {type: 'string'},
              subtitle: {type: 'string'},
              status: {
                type: 'string',
                enum: Object.values(TodoStatus),
              },
            },
          },
        },
      },
    })
    todo: Partial<Todo>,
  ): Promise<void> {
    await this.todoRepository.updateById(id, todo);
  }

  @del('/todos/{id}')
  @response(204, {
    description: 'Todo DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.todoRepository.updateById(id, {status: TodoStatus.DELETED});
  }
}
