# electerm-sync API js wrapper

[![Build Status](https://github.com/electerm/electerm-sync/actions/workflows/linux.yml/badge.svg)](https://github.com/electerm/electerm-sync/actions)

## Installation

### Node.js

```bash
npm i electerm-sync
```

## Usage

```js
import ElectermSync from 'gitee-client'

const gc = new ElectermSync(
  token
)

gc.create(data, {})
gc.update(userId, data, {})
gc.getOne(userId, {})
gc.test({})
```

## Test

```bash
npm run test
```

## Credits

Based on [Tyler](https://github.com/tylerlong)'s [https://github.com/tylerlong/ringcentral-js-concise](https://github.com/tylerlong/ringcentral-js-concise).

## License

MIT
