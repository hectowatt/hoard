import concurrently from "concurrently";

const mode = process.argv[2] || "dev";

console.log(`
  _   _                     _ 
 | | | | ___   __ _ _ __ __| |
 | |_| |/ _ \\ / _\` | '__/ _\` |
 |  _  | (_) | (_| | | | (_| |
 |_| |_|\\___/ \\__,_|_|  \\__,_|
`);

console.log(`Hoard starting in ${mode} mode...\n`);

const commands =
  mode === "prod"
    ? [
      { command: "npm run start -w packages/backend", name: "app" }
    ]
    : [
      { command: "npm run dev -w packages/backend", name: "app" }
    ];

concurrently(commands, {
  prefixColors: ["green"],
  killOthersOn: ["failure", "success"],
});