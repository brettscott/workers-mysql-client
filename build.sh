#!/bin/bash
mkdir -p build
deno bundle https://deno.land/x/mysql@v2.10.2/mod.ts > build/mysql-deno.js
deno bundle https://deno.land/std@0.138.0/async/deferred.ts > build/deferred.js
deno bundle https://deno.land/std@0.138.0/io/buffer.ts > build/buffer.js
deno run --allow-all build-types.ts
node build.js
