# Todo API 專案

這是一個基於 LoopBack 4 框架開發的 Todo API 服務。

## 專案架構

```
.
├── src/                    # 源代碼目錄
│   ├── controllers/        # API 控制器
│   ├── models/            # 數據模型定義
│   ├── repositories/      # 數據存取層
│   ├── services/          # 業務邏輯服務
│   ├── datasources/       # 數據源配置
│   └── decorators/        # 自定義裝飾器
├── public/                # 靜態資源
├── dist/                  # 編譯後的代碼
└── __tests__/            # 測試文件
```

## 環境要求

- Node.js 18+ / 20+ / 22+
- MySQL 8.0
- Docker 和 Docker Compose
- Visual Studio Code（推薦）

## 開發環境設置

本專案使用 VS Code 的 Dev Containers 功能進行開發，這提供了一個一致且隔離的開發環境。

### 使用 Dev Container 開發（推薦）

1. 安裝必要的工具：

   - 安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - 安裝 [Visual Studio Code](https://code.visualstudio.com/)
   - 在 VS Code 中安裝 [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) 擴展

2. 配置環境變數：

```bash
cp .env.example .env.dev
```

編輯 `.env.dev` 文件，設置必要的環境變數：

3. 啟動開發環境：

   - 在 VS Code 中打開專案資料夾
   - 當提示時，點擊 "Reopen in Container"，或使用命令面板（F1）執行 "Dev Containers: Reopen in Container"
   - 等待容器建立和依賴安裝完成

4. 開發相關指令

```bash
npm run build
npm run migrate
npm start
```

## 生產環境部署

### 使用 Docker（推薦）

1. 配置生產環境變數：

```bash
cp .env.example .env.prod
```

2. 構建並啟動容器：

```bash
docker-compose --env-file .env.prod -f docker-compose.prod.yml build
docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## API 功能

服務啟動後，可以通過以下地址查看完整的 API 文檔：

- http://localhost:3000/explorer

### Todo API 端點

#### 獲取所有待辦事項

```http
GET /todos
```

支援過濾參數：

```typescript
{
  "filter": {
    "where": {
      "status": "ACTIVE",           // 根據狀態過濾：ACTIVE, COMPLETED, DELETED
      "title": {"like": "會議"},    // 標題模糊搜尋
      "subtitle": {"like": "週會"}  // 副標題模糊搜尋
    },
    "fields": {                     // 選擇返回的欄位
      "id": true,
      "title": true,
      "status": true
    },
    "include": [{                   // 包含關聯數據
      "relation": "items"
    }],
    "order": ["id DESC"],          // 排序
    "limit": 10,                   // 分頁大小
    "skip": 0                      // 分頁起始位置
  }
}
```

#### 獲取特定待辦事項

```http
GET /todos/{id}
```

支援過濾參數：

```typescript
{
  "filter": {
    "fields": {                     // 選擇返回的欄位
      "id": true,
      "title": true,
      "status": true
    },
    "include": [{                   // 包含關聯數據
      "relation": "items",
      "scope": {                    // items 的過濾條件
        "where": {
          "isCompleted": true
        },
        "order": ["completedAt DESC"]
      }
    }]
  }
}
```

#### 創建待辦事項

```http
POST /todos
```

請求體範例：

```json
{
  "todo": {
    "title": "週會",
    "subtitle": "產品開發討論",
    "status": "ACTIVE"
  },
  "items": [
    {
      "content": "準備會議資料",
      "isCompleted": false
    },
    {
      "content": "發送會議通知",
      "isCompleted": true,
      "completedAt": "2024-03-14T10:00:00Z"
    }
  ]
}
```

#### 更新待辦事項

```http
PATCH /todos/{id}
```

#### 刪除待辦事項

```http
DELETE /todos/{id}
```

### Item API 端點

#### 獲取特定待辦事項的所有項目

```http
GET /todos/{todoId}/items
```

支援過濾參數：

```typescript
{
  "filter": {
    "where": {
      "isCompleted": true,
      "completedAt": {"gt": "2024-03-01T00:00:00Z"}
    },
    "order": ["completedAt DESC"],
    "limit": 10,
    "skip": 0
  }
}
```

#### 創建項目

```http
POST /todos/{todoId}/items
```

#### 更新項目

```http
PATCH /items/{id}
```

#### 刪除項目

```http
DELETE /items/{id}
```

## 數據庫遷移

執行數據庫遷移：

```bash
npm run migrate
```

## 開發指令

- `npm run build`: 構建專案
- `npm test`: 運行測試

## 專案特性

- 基於 LoopBack 4 框架
- TypeScript 支持
- REST API
- OpenAPI (Swagger) 文檔
- MySQL 數據庫支持
- Docker 容器化支持
- 自動化測試
- ESLint + Prettier 代碼規範
