import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { RedirectionInfo } from "../utils/redirection";

export function executeExternal(
    cmd: string,
    { cleanArgs, stdoutFile, stderrFile }: RedirectionInfo
): void {
    let stdoutFd: number | "inherit" = "inherit";
    let stderrFd: number | "inherit" = "inherit";

    try {
        if (stdoutFile) {
            fs.mkdirSync(path.dirname(stdoutFile), { recursive: true });
            stdoutFd = fs.openSync(stdoutFile, "w");
        }
        if (stderrFile) {
            fs.mkdirSync(path.dirname(stderrFile), { recursive: true });
            stderrFd = fs.openSync(stderrFile, "w");
        }

        execFileSync(cmd, cleanArgs, {
            stdio: ["inherit", stdoutFd, stderrFd],
        });
    } catch {
        // Process exited with error code (e.g., cat nonexistent); stderr is written to file automatically
    } finally {
        if (typeof stdoutFd === "number") fs.closeSync(stdoutFd);
        if (typeof stderrFd === "number") fs.closeSync(stderrFd);
    }
}

export function prepareRedirectionFiles(redirection: RedirectionInfo): void {
    if (redirection.stdoutFile) {
        fs.mkdirSync(path.dirname(redirection.stdoutFile), { recursive: true });
        if (!fs.existsSync(redirection.stdoutFile)) {
            fs.writeFileSync(redirection.stdoutFile, "");
        }
    }
    if (redirection.stderrFile) {
        fs.mkdirSync(path.dirname(redirection.stderrFile), { recursive: true });
        if (!fs.existsSync(redirection.stderrFile)) {
            fs.writeFileSync(redirection.stderrFile, "");
        }
    }
}