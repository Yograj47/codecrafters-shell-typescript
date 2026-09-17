import * as fs from "node:fs";
import * as path from "node:path";

export type Mode = "w" | "a";

export interface RedirectionTarget {
    file: string;
    mode: Mode;
}

export interface RedirectionInfo {
    cleanArgs: string[];
    stdout?: RedirectionTarget;
    stderr?: RedirectionTarget;
}

export function parseRedirections(args: string[]): RedirectionInfo {
    const cleanArgs: string[] = [];
    let stdout: RedirectionTarget | undefined;
    let stderr: RedirectionTarget | undefined;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === ">" || arg === "1>") {
            stdout = { file: args[i + 1], mode: "w" };
            i++;
        } else if (arg === ">>" || arg === "1>>") {
            stdout = { file: args[i + 1], mode: "a" };
            i++;
        } else if (arg === "2>") {
            stderr = { file: args[i + 1], mode: "w" };
            i++;
        } else if (arg === "2>>") {
            stderr = { file: args[i + 1], mode: "a" };
            i++;
        } else {
            cleanArgs.push(arg);
        }
    }

    return { cleanArgs, stdout, stderr };
}

export function prepareRedirectionFiles(redirection: RedirectionInfo): void {
    if (redirection.stdout) {
        fs.mkdirSync(path.dirname(redirection.stdout.file), { recursive: true });
        if (!fs.existsSync(redirection.stdout.file)) {
            fs.writeFileSync(redirection.stdout.file, "");
        }
    }
    if (redirection.stderr) {
        fs.mkdirSync(path.dirname(redirection.stderr.file), { recursive: true });
        if (!fs.existsSync(redirection.stderr.file)) {
            fs.writeFileSync(redirection.stderr.file, "");
        }
    }
}