import { createInterface } from "readline";
import * as path from "node:path";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import * as os from "node:os";

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

function parseToken(line: string) {
  const tokens: string[] = [];
  let currentArg = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '\\' && !inSingleQuote) {

      if (i + 1 < line.length) {
        const nextChar = line[i + 1];

        if (inDoubleQuote) {
          if (nextChar === '"' || nextChar === '\\') {
            i++;
            currentArg += nextChar;
          } else {
            currentArg += char;
          }
        }
        else {
          i++
          currentArg += nextChar;
        }
      }
      else {
        currentArg += char;
      }

    } else if (char === "'") {
      if (!inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else {
        currentArg += char;
      }
    }
    else if (char === '"') {
      if (!inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else {
        currentArg += char;
      }
    }
    else if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (currentArg.length > 0) {
        tokens.push(currentArg);
        currentArg = "";
      }
    }
    else {
      currentArg += char;
    }
  }

  if (currentArg.length > 0) {
    tokens.push(currentArg);
  }

  return tokens;
}

rl.on("line", (rawInput) => {
  const line = rawInput.trim();
  if (!line) {
    rl.prompt();
    return;
  }

  const tokens = parseToken(line);
  const cmd = tokens[0];
  const args = tokens.slice(1);
  const inputString = args.join(" ");

  switch (cmd) {
    case "exit":
      rl.close();
      return;

    case "echo":
      let redirectIndex = args.indexOf(">");
      if (redirectIndex === -1) {
        redirectIndex === args.indexOf("1>")
      }

      if (redirectIndex !== -1) {
        const textToPrint = args.slice(0, redirectIndex).join(" ");
        const filePath = args[redirectIndex + 1];

        if (filePath) {
          try {
            fs.writeFileSync(filePath, textToPrint + "\n");
          } catch {
          }
        } else {
          console.log("echo: syntax error near unexpected token 'newline'");
        }
      }
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
      let targetPath = inputString;

      if (targetPath === "~" || targetPath.startsWith("~/")) {
        const homedir = process.env.HOME || os.homedir();
        targetPath = path.join(homedir, targetPath.slice(1));
      }

      try {
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
          process.chdir(targetPath);
        } else {
          console.log(`cd: ${inputString}: No such directory`);
        }
      } catch {
        console.log(`cd: ${inputString}: No such file or directory`);
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