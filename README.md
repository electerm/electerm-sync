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

# Nodejs Electerm sync server

[![Build Status](https://github.com/electerm/electerm-sync-server-node/actions/workflows/linux.yml/badge.svg)](https://github.com/electerm/electerm-sync-server-node/actions)

A simple electerm data sync server.

## Use

Requires git/nodejs 16+/npm, recommend install nodejs/npm with [nvm](https://github.com/nvm-sh/nvm)

```bash
git clone git@github.com:electerm/electerm-sync-server-node.git
cd electerm-sync-server-node
npm i

# create env file, then edit .env
cp sample.env .env

node src/server.js

# would show something like
# server running at http://127.0.0.1:7837

# in electerm sync settings, set custom sync server with:
# server url: http://127.0.0.1:7837
# JWT_SECRET: your JWT_SECRET in .env
# JWT_USER_NAME: one JWT_USER in .env
```

## Test

```bash
# create env file, then edit .env
cp sample.env .env

npm run test
```

## Write your own data store

Just take [src/file-store.js](src/file-store.js) as an example, write your own read/write method

## License

MIT
