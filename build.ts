await Bun.build({
  entrypoints: ["./index.ts", "./server.ts"],
  outdir: "./build",
});
