import concurrently from "concurrently";

const mode = process.argv[2] || "dev";

console.log(`
 ██╗  ██╗  ██████╗   █████╗  ██████╗  ██████╗ 
 ██║  ██║ ██╔═══██╗ ██╔══██╗ ██╔══██╗ ██╔══██╗
 ███████║ ██║   ██║ ███████║ ██████╔╝ ██║  ██║
 ██╔══██║ ██║   ██║ ██╔══██║ ██╔══██╗ ██║  ██║
 ██║  ██║ ╚██████╔╝ ██║  ██║ ██║  ██║ ██████╔╝
 ╚═╝  ╚═╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═════╝ 
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