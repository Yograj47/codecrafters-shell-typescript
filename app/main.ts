import { createInterface } from "readline";
import * as path from "node:path";
import * as fs from "node:fs";
import { execSync } from "node:child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

function searchPath(command: string): string | null {
  const pathEnv = process.env.PATH || "";
  const folder = pathEnv.split(path.delimiter).find((dir) => {
    const fullPath = path.join(dir, command);
    try {
      if (!fs.existsSync(fullPath)) return false;
      const stats = fs.statSync(fullPath);
      return !!(fs.constants.X_OK & stats.mode);
    } catch {
      return false;
    }
  });

  return folder ? path.join(folder, command) : null;
}

rl.on("line", (rawInput) => {
  const line = rawInput.trim();
  if (!line) {
    rl.prompt();
    return;
  }

  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  const inputString = args.join(" ");

  switch (cmd) {
    case "exit":
      rl.close();
      return;

    case "echo":
      console.log(inputString);
      break;

    case "pwd":
      console.log(process.cwd());
      break;

    case "type": {
      const builtins = ["echo", "type", "pwd", "exit", "cd"];
      if (builtins.includes(inputString)) {
        console.log(`${inputString} is a shell builtin`);
      } else {
        const matchPath = searchPath(inputString);
        if (matchPath) {
          console.log(`${inputString} is ${matchPath}`);
        } else {
          console.log(`${inputString}: not found`);
        }
      }
      break;
    }

    case "cd": {
      if (!inputString) break;
      try {
        const stats = fs.statSync(inputString);
        if (stats.isDirectory()) {
          process.chdir(inputString);
        } else {
          console.log(`cd: ${inputString}: No such file or directory`);
        }
      } catch {
      }
      break;
    }

    default:
      if (searchPath(cmd)) {
        try {
          execSync(line, { stdio: "inherit" });
        } catch {
        }
      } else {
        console.log(`${line}: command not found`);
      }
      break;
  }

  rl.prompt();
});