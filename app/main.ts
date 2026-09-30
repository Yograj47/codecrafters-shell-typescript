import { createInterface } from "node:readline";
import { parseToken } from "./utils/tokenizer";
import { parseRedirections, prepareRedirectionFiles } from "./utils/redirection";
import { searchPath } from "./services/pathResolver";
import { executeExternal } from "./services/commandExecutor";
import { handleEcho, handleType, handleCd, handleComplete, handleJobs } from "./commands/builtins";
import { completer } from "./utils/completer";
import { reapCompletedJobs } from "./services/jobManager";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer: completer
});

function promptNext(): void {
  reapCompletedJobs();
  rl.prompt();
}

promptNext();

rl.on("line", async (rawInput) => {
  const line = rawInput.trim();

  if (!line) {
    promptNext();
    return;
  }

  // 1. Tokenize input
  const rawTokens = parseToken(line);

  // 2. Check if the command should run in the backgroune (&)
  let isBackground = false;
  if (rawTokens.length > 0 && rawTokens[rawTokens.length - 1] === "&") {
    isBackground = true;
    rawTokens.pop();
  }

  // 3. Separate command args from redirection flags (> and 2>)
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

    case "jobs":
      handleJobs();
      break;

    default:
      if (searchPath(cmd)) {
        await executeExternal(cmd, redirectionInfo, isBackground);
      } else {
        console.log(`${line}: command not found`);
      }
      break;
  }

  promptNext();
});