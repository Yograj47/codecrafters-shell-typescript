import { createInterface } from "node:readline";
import { parseToken } from "./utils/tokenizer";
import { parseRedirections, prepareRedirectionFiles } from "./utils/redirection";
import { searchPath } from "./services/pathResolver";
import { executeExternal } from "./services/commandExecutor";
import { handleEcho, handleType, handleCd, handleComplete } from "./commands/builtins";
import { completer } from "./utils/completer";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer: completer
});

rl.prompt();

rl.on("line", (rawInput) => {
  const line = rawInput.trim();
  if (!line) {
    rl.prompt();
    return;
  }

  // 1. Tokenize input
  const rawTokens = parseToken(line);

  // 2. Separate command args from redirection flags (> and 2>)
  const cmd = rawTokens[0];
  const redirectionInfo = parseRedirections(rawTokens.slice(1));

  prepareRedirectionFiles(redirectionInfo);

  switch (cmd) {
    case "exit":
      rl.close();
      return;

    case "echo":
      handleEcho(redirectionInfo.cleanArgs, redirectionInfo.stdout);
      break;

    case "pwd":
      console.log(process.cwd());
      break;

    case "type":
      handleType(redirectionInfo.cleanArgs[0] || "");
      break;

    case "cd":
      handleCd(redirectionInfo.cleanArgs[0] || "");
      break;

    case "complete":
      handleComplete(redirectionInfo.cleanArgs);
      break;

    default:
      if (searchPath(cmd)) {
        executeExternal(cmd, redirectionInfo);
      } else {
        console.log(`${line}: command not found`);
      }
      break;
  }

  rl.prompt();
});