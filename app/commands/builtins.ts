import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { searchPath } from "../services/pathResolver";
import type { RedirectionTarget } from "../utils/redirection";
import { getJobs } from "../services/jobManager";

export const BUILTIN_COMMANDS = ["echo", "type", "pwd", "exit", "cd", "complete", "jobs"] as const;

export const completionRegistry = new Map<string, string>();

export function handleEcho(cleanArgs: string[], stdout?: RedirectionTarget): void {
    const textToPrint = cleanArgs.join(" ") + "\n";

    if (stdout) {
        if (stdout.mode === "a") {
            fs.appendFileSync(stdout.file, textToPrint);
        } else {
            fs.writeFileSync(stdout.file, textToPrint);
        }
    } else {
        process.stdout.write(textToPrint);
    }
}

export function handleType(target: string): void {
    if (BUILTIN_COMMANDS.includes(target as any)) {
        console.log(`${target} is a shell builtin`);
        return;
    }

    const matchPath = searchPath(target);
    if (matchPath) {
        console.log(`${target} is ${matchPath}`);
    } else {
        console.log(`${target}: not found`);
    }
}

export function handleCd(targetPath: string): void {
    let resolvedPath = targetPath;

    if (resolvedPath === "~" || resolvedPath.startsWith("~/")) {
        const homedir = process.env.HOME || os.homedir();
        resolvedPath = path.join(homedir, resolvedPath.slice(1));
    }

    try {
        const stats = fs.statSync(resolvedPath);
        if (stats.isDirectory()) {
            process.chdir(resolvedPath);
        } else {
            console.log(`cd: ${targetPath}: No such directory`);
        }
    } catch {
        console.log(`cd: ${targetPath}: No such file or directory`);
    }
}

export function handleComplete(args: string[]): void {
    if (args.length >= 3 && args[0] === "-C") {
        const scriptPath = args[1];
        const commandName = args[2];
        completionRegistry.set(commandName, scriptPath);
        return;
    }

    if (args.length >= 2 && args[0] === "-r") {
        const commandName = args[1];
        completionRegistry.delete(commandName);
        return;
    }

    if (args.length >= 2 && args[0] === "-p") {
        const commandName = args[1];
        const scriptPath = completionRegistry.get(commandName);

        if (scriptPath) {
            console.log(`complete -C '${scriptPath}' ${commandName}`);
        } else {
            console.log(`complete: ${commandName}: no completion specification`);
        }
        return;
    }
}

export function handleJobs(): void {
    const jobs = getJobs();
    const count = jobs.length;

    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        let marker = "";

        if (i === count - 1) {
            marker = "+";
        } else if (i === count - 2) {
            marker = "-";
        }

        const statusPadded = job.status.padEnd(24, " ");

        const ampersand = job.status === "Running" ? " &" : "";

        process.stdout.write(`[${job.id}]${marker}  ${statusPadded}${job.command}${ampersand}\n`);
    }
}

export function printError(message: string, stderrFile?: string): void {
    if (stderrFile) {
        fs.writeFileSync(stderrFile, message + "\n");
    } else {
        process.stderr.write(message + "\n");
    }
}

/**
 * Executes a built-in command and returns its string output.
 * Used when built-ins are producers or consumers inside a pipeline.
 */
export function runBuiltinToString(cmd: string, args: string[]): string {
    switch (cmd) {
        case "echo":
            return args.join(" ") + "\n";

        case "pwd":
            return process.cwd() + "\n";

        case "type": {
            const target = args[0] || "";
            if (BUILTIN_COMMANDS.includes(target as any)) {
                return `${target} is a shell builtin\n`;
            }
            const matchPath = searchPath(target);
            if (matchPath) {
                return `${target} is ${matchPath}\n`;
            }
            return `${target}: not found\n`;
        }

        case "jobs": {
            const jobs = getJobs();
            const count = jobs.length;
            let output = "";

            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                let marker = "";
                if (i === count - 1) marker = "+";
                else if (i === count - 2) marker = "-";

                const statusPadded = job.status.padEnd(24, " ");
                const ampersand = job.status === "Running" ? " &" : "";

                output += `[${job.id}]${marker}  ${statusPadded}${job.command}${ampersand}\n`;
            }
            return output;
        }

        default:
            return "";
    }
}