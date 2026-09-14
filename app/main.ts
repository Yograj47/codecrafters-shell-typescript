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

function searchPath(command: string) {

  const folder = process.env.PATH?.split(path.delimiter).find((path) => {
    if (!fs.existsSync(path + '/' + command)) return false
    if (!(fs.constants.X_OK & fs.statSync(path + '/' + command).mode)) return false
    return true
  })

  return folder ? folder + '/' + command : null;
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
  const inputString = args.join(' ');

  if (cmd === "exit") {
    rl.close();
    return;
  } else if (cmd === "echo") {
    console.log(inputString);
  } else if (cmd === "pwd") {
    console.log(process.cwd());
  }
  else if (cmd === "type") {
    const builtins = ['echo', 'type', 'pwd', 'exit'];
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
    execSync(line, { stdio: 'inherit' });
  } else {
    console.log(`${line}: command not found`);
  }

  rl.prompt();
});