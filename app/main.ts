import { createInterface } from "readline";
import * as path from "node:path";
import * as fs from "node:fs";
import { execSync, spawn } from "node:child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

function searchPath(command: string) {

  const folder = process.env.PATH?.split(path.delimiter).find((path) => {
    if (!fs.existsSync(path + '/' + command)) return false
    if (!(fs.constants.X_OK & fs.statSync(path + '/' + command).mode)) return false
    return true
  })

  return folder ? folder + '/' + command : null;
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
  } else if (command === "echo") {
    console.log(inputString);
  } else if (command === "type") {
    const builtins = ['echo', 'type', 'exit'];

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
  } else if (searchPath(cmd)) {
    execSync(command, { stdio: 'inherit' });
  } else {
    rl.write(`${command}: command not found\n`);
  }

  rl.prompt();
});