import * as process from "node:process";
import { BUILTIN_COMMANDS } from "../commands/builtins.js";
import { getExecutablesFromPath } from "../services/pathResolver.js";

let lastTabLine = "";
let lastTabTime = 0;

export function completer(line: string): [string[], string] {
    const allCommands = new Set<string>([
        ...BUILTIN_COMMANDS,
        ...getExecutablesFromPath(),
    ]);

    const hits = Array.from(allCommands)
        .filter((cmd) => cmd.startsWith(line))
        .sort();

    const now = Date.now();

    if (hits.length === 0) {
        process.stdout.write("\x07");
        lastTabLine = "";
        return [[], line];
    }

    if (hits.length === 1) {
        lastTabLine = "";
        return [[hits[0] + " "], line];
    }

    const isSecondTab = line === lastTabLine && now - lastTabTime < 2000;

    if (isSecondTab) {
        process.stdout.write("\n" + hits.join("  ") + "\n");

        process.stdout.write("$ " + line);

        lastTabLine = "";
        return [[], line];
    } else {

        process.stdout.write("\x07");
        lastTabLine = line;
        lastTabTime = now;

        return [[], line];
    }
}