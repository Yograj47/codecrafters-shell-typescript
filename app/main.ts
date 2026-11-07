import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createInterface } from "node:readline";
import { parseToken } from "./utils/tokenizer";
import { parseRedirections, prepareRedirectionFiles } from "./utils/redirection";
import { searchPath } from "./services/pathResolver";
import { executeExternal } from "./services/commandExecutor";
import { handleEcho, handleType, handleCd, handleComplete, handleJobs, handleHistory } from "./commands/builtins";
import { completer } from "./utils/completer";
import { reapCompletedJobs } from "./services/jobManager";
import { executePipeline } from "./services/pipelineExecutor";
import { addHistory, getHistory } from "./services/historyManager";

// Determine history file path (standard POSIX convention)
const histFile = process.env.HISTFILE || path.join(os.homedir(), ".bash_history");

// Read history on startup
try {
  if (fs.existsSync(histFile)) {
    const fileContent = fs.readFileSync(histFile, "utf-8");
    const lines = fileContent.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        addHistory(line);
      }
    }
  }
} catch {
  // Fail silently if permissions or file issues occur
}

// Helper to save history on exit
function saveHistoryOnExit(mode: "write" | "append" = "write") {
  try {
    const history = getHistory();
    const content = history.join("\n") + "\n";

    if (mode === "append") {
      fs.appendFileSync(histFile, content, "utf-8");
    } else {
      fs.writeFileSync(histFile, content, "utf-8");
    }
  } catch {
    // Fail silently
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer: completer
});

rl.on("close", () => {
  saveHistoryOnExit("write");
  process.exit(0);
})

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

  addHistory(line);

  // 1. Tokenize input
  const rawTokens = parseToken(line);

  const stages: string[][] = [];
  let currentStage: string[] = [];

  for (const token of rawTokens) {
    if (token === "|") {
      if (currentStage.length > 0) {
        stages.push(currentStage);
        currentStage = [];
      }
    } else {
      currentStage.push(token);
    }
  }

  if (currentStage.length > 0) {
    stages.push(currentStage);
  }

  if (stages.length > 1) {
    await executePipeline(stages);
    promptNext();
    return;
  }

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

    case "history":
      handleHistory(redirectionInfo.cleanArgs, redirectionInfo.stdout);
      break;

    case "exit":
      saveHistoryOnExit("write");
      process.exit(0);

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