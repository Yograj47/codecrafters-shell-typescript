import * as process from "node:process";
import { BUILTIN_COMMANDS } from "../commands/builtins.js";
import { getExecutablesFromPath } from "../services/pathResolver.js";

export function completer(line: string): [string[], string] {
    const allCommands = new Set<string>([
        ...BUILTIN_COMMANDS,
        ...getExecutablesFromPath(),
    ]);

    const candidates = Array.from(allCommands).map((cmd) => cmd + " ");
    const hits = candidates.filter((cmd) => cmd.startsWith(line));

    if (hits.length === 0) {
        process.stdout.write("\x07");
        return [[], line];
    }

    return [hits, line];
}