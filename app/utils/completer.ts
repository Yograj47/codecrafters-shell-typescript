import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
import { BUILTIN_COMMANDS, completionRegistry } from "../commands/builtins.js";
import { getExecutablesFromPath } from "../services/pathResolver.js";

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

    // ==========================================
    // CASE 1: Argument Completion
    // ==========================================
    if (lastSpaceIndex !== -1) {
        const words = line.trimStart().split(/\s+/);
        const firstWord = words[0];
        const registeredScript = completionRegistry.get(firstWord);

        // ------------------------------------------
        // 1A. Registered Completer Script Execution
        // ------------------------------------------
        if (registeredScript) {
            const currentWord = line.endsWith(" ") ? "" : words[words.length - 1] || "";
            const prevWord = line.endsWith(" ")
                ? words[words.length - 1] || ""
                : words[words.length - 2] || "";

            try {
                // Pass command, currentWord, and prevWord as ARGV[1], ARGV[2], ARGV[3]
                const stdout = execFileSync(registeredScript, [firstWord, currentWord, prevWord], {
                    encoding: "utf-8",
                    stdio: ["ignore", "pipe", "ignore"],
                });

                const lines = stdout
                    .split("\n")
                    .map((l) => l.trim())
                    .filter((l) => l.length > 0);

                if (lines.length === 1) {
                    const commandPrefix = line.slice(0, lastSpaceIndex + 1);
                    return [[commandPrefix + lines[0] + " "], line];
                }

                if (lines.length > 1) {
                    return [lines, currentWord];
                }
            } catch {
                return [[], line];
            }
        }

        // ------------------------------------------
        // 1B. Fallback to Filesystem Completion
        // ------------------------------------------
        const commandPrefix = line.slice(0, lastSpaceIndex + 1);
        const argPrefix = line.slice(lastSpaceIndex + 1);

        const lastSlashIndex = argPrefix.lastIndexOf("/");
        let dirPart = "";
        let filePrefix = argPrefix;

        if (lastSlashIndex !== -1) {
            dirPart = argPrefix.slice(0, lastSlashIndex + 1);
            filePrefix = argPrefix.slice(lastSlashIndex + 1);
        }

        const targetDir = path.resolve(process.cwd(), dirPart);

        try {
            if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
                return [[], line];
            }

            const files = fs.readdirSync(targetDir);
            const hits = files.filter((f) => f.startsWith(filePrefix)).sort();

            if (hits.length === 0) {
                return [[], line];
            }

            if (hits.length === 1) {
                const fullPath = path.join(targetDir, hits[0]);
                let isDir = false;
                try {
                    isDir = fs.statSync(fullPath).isDirectory();
                } catch {
                    // ignore
                }
                const suffix = isDir ? "/" : " ";
                return [[commandPrefix + dirPart + hits[0] + suffix], line];
            }

            const lcp = findLongestCommonPrefix(hits);
            if (lcp.length > filePrefix.length) {
                return [[commandPrefix + dirPart + lcp], line];
            }

            return [hits, argPrefix];
        } catch {
            return [[], line];
        }
    }

    // ==========================================
    // CASE 2: Command Completion (Builtins + PATH)
    // ==========================================
    const allCommands = new Set<string>([
        ...BUILTIN_COMMANDS,
        ...getExecutablesFromPath(),
    ]);

    const hits = Array.from(allCommands)
        .filter((cmd) => cmd.startsWith(line))
        .sort();

    if (hits.length === 0) return [[], line];
    if (hits.length === 1) return [[hits[0] + " "], line];

    const lcp = findLongestCommonPrefix(hits);
    if (lcp.length > line.length) {
        return [[lcp], line];
    }

    return [hits, line];
}