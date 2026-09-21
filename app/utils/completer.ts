import * as fs from "node:fs";
import * as process from "node:process";
import { BUILTIN_COMMANDS } from "../commands/builtins.js";
import { getExecutablesFromPath } from "../services/pathResolver.js";

let lastTabLine = "";
let lastTabTime = 0;

function findLongestCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (!strings[i].startsWith(prefix)) {
            prefix = prefix.slice(0, -1);
            if (prefix === "") return "";
        }
    }
    return prefix;
}

export function completer(line: string): [string[], string] {

    const lastSpaceIndex = line.lastIndexOf(" ");

    if (lastSpaceIndex !== -1) {
        const commandPrefix = line.slice(0, lastSpaceIndex + 1);
        const argPrefix = line.slice(lastSpaceIndex + 1);
        try {
            const files = fs.readdirSync(process.cwd());
            const hits = files.filter(f => f.startsWith(argPrefix)).sort();

            if (hits.length === 0) {
                process.stdout.write("\x07");
                return [[], line];
            }

            if (hits.length === 1) {
                return [[commandPrefix + hits[0] + " "], line];
            }
            const lcp = findLongestCommonPrefix(hits);
            if (lcp.length > argPrefix.length) {
                return [[commandPrefix + lcp], line];
            }

            return [[commandPrefix + hits[0] + " "], line];
        } catch {
            process.stdout.write("\x07");
            return [[], line];
        }
    }

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

    const lcp = findLongestCommonPrefix(hits);

    if (lcp.length > line.length) {
        lastTabLine = "";
        return [[lcp], line];
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