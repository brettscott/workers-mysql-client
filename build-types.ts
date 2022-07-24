import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./build/types-package");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./build/types-package",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "workers-mysql-client",
    version: '0.0.0',
  },
  typeCheck: false,
  test: false,
  declaration: true,
  scriptModule: false,
});
