# Cloudflare Workers MySQL Client


## Intro

Fork from [@nicgene/workers-mysql-client](https://img.shields.io/npm/v/@nicgene/workers-mysql-client).

The script uses the MySQL driver from Deno and produces a JavaScript (TypeScript) version to be used in workers (eg Cloudflare Workers).

## Changes

- Updated dependencies.
- Increased documentation.

## Create a working MySQL driver for Cloudflare Worker

1. Install Deno

[Instructions](https://deno.land/manual@v1.31.1/getting_started/installation)

2. Build

```sh
yarn install
yarn build
```

3. Remove top-level await by wrapping with an `async`.  Search for "await setup" in `mysql.js`.

**Broken:**

```js
await setup(DEFAULT_CONFIG)
var mod = await (async function () {
  return {
    LogLevels,
    Logger,
    LoggerConfig,
    handlers,
    getLogger,
    debug,
    info,
    warning,
    error,
    critical,
    setup,
  }
})()
var logger = mod.getLogger()
```

**Fixed:**

```js
let mod
let logger
;(async () => {
  try {
    await setup(DEFAULT_CONFIG)
  } catch (err) {
    console.error(err)
  }
  mod = await (async function () {
    return {
      LogLevels,
      Logger,
      LoggerConfig,
      handlers,
      getLogger,
      debug,
      info,
      warning,
      error,
      critical,
      setup,
    }
  })()
  logger = mod.getLogger()
})()
```

4. Comment out second `case 18`.  Search for "case 18" in `mysql.js`.

**Broken:**

```js
case 18:
return new Date(val)
```

**Fixed:**

```js
// case 18:
//   return new Date(val)
```

5. Copy `build/mysql.js` to your project.

6. Create TypeScript type definition in your project. Incomplete:

```ts
export type MySQLClient = {
  execute(str: string): Promise<MySQLResponse>
  query<T>(str: string, params: unknown[]): Promise<T>
}

export type MySQLResponse = {
  affectedRows: number
  lastInsertId: number
}
```

## Example `mysql.js`

A copy of [mysql.js](./example/mysql.js) is provided.

## Feedback

Raise an issue if there's a better way :)

----

# Original

This is an experimental module.

Heavily based on [bubblydoo/cloudflare-workers-postgres-client ](https://github.com/bubblydoo/cloudflare-workers-postgres-client).

<!-- This needs a Cloudflare Tunnel to your database running. To setup a Cloudflare Tunnel, you can use [this docker-compose.yml](https://github.com/bubblydoo/cloudflare-tunnel-postgres-docker-compose/blob/main/docker-compose.yml). -->

```bash
npm i @nicgene/workers-mysql-client
# or
yarn add @nicgene/workers-mysql-client
```

<!-- ```ts
import { Client } from '@nicgene/workers-mysql-client';

const createClient = () => {
  return new Client({
    user: 'postgres',
    database: 'postgres',
    hostname: 'https://<YOUR CLOUDFLARE TUNNEL>',
    password: 'keyboardcat',
    port: 5432,
  });
}

const worker = {
  async fetch(request, env, ctx) {
    const client = createClient();

    await client.connect()

    const userIds = await client.queryArray('select id from "Users" limit 10');

    ctx.waitUntil(client.end());

    return new Response(JSON.stringify(userIds));
  }
}

export default worker;
```

## How it works

It uses the [postgres](https://deno.land/x/postgres@v0.16.1) Deno module, bundles it, and adds some code to make it work with Cloudflare Workers. -->
