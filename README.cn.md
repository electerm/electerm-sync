# electerm-sync API js 封装

[English](README.md) | [简体中文](README.cn.md)

## 安装

### Node.js

```bash
npm i electerm-sync
```

## 使用

```js
import { electermSync } from 'electerm-sync'
import axios from 'axios'

// type: 'github', 'gitee', 'custom', 'cloud'
// func: 'test', 'create', 'update', 'getOne'
// args: 函数参数数组
// token: 访问令牌或连接字符串
const result = await electermSync(
  axios.create(),
  'github',
  'test',
  [],
  'your-github-token'
)
```

## 测试

```bash
npm run test
```

## 证书

MIT
