import { createInterface } from "readline";
import * as path from "node:path";
import * as fs from "node:fs";
import { spawn } from "node:child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

function searchPath(extPath: string) {

  const envPath = process.env.PATH || '';
  const pathDirs = envPath.split(path.delimiter);

  const extensions = process.platform === "win32" ? ['.exe', '.cmd', '.bat', ''] : [''];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, extPath + ext);

      try {
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return fullPath;
          }
        }
      } catch {
      }
    }
  }

  return null;
}

const KNOWN_CMDS: Record<string, (str: string) => void> = {
  'echo': (str: string) => console.log(str),
  'type': (str: string): void => {
    const builtins = ['echo', 'type', 'exit'];

    if (builtins.includes(str)) {
      console.log(`${str} is a shell builtin`);
    } else {
      const matchPath = searchPath(str);
      if (matchPath) {
        console.log(`${str} is ${matchPath}`);
      } else {
        console.log(`${str}: not found`);
      }
    }
  },

  'invalidCmd': (cmd: string) => console.log(`${cmd}: command not found`),
};

rl.on("line", (command) => {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  const inputString = args.join(' ');

  if (command === "exit") {
    rl.close();
    return;
  }

  const ansFn = KNOWN_CMDS[cmd];

  if (ansFn) {
    ansFn(inputString);
  } else {
    const matchPath = searchPath(cmd);
    if (matchPath) {
      const child = spawn(matchPath, args, { stdio: 'inherit' });

      child.on("close", () => {
        rl.prompt();
      });
    } else {
      console.log(`${cmd}: command not found`);
      rl.prompt();
    }
  }

  rl.prompt();
});