import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { RedirectionInfo } from "../utils/redirection";

export function executeExternal(
    cmd: string,
    { cleanArgs, stdout, stderr }: RedirectionInfo
): void {
    let stdoutFd: number | "inherit" = "inherit";
    let stderrFd: number | "inherit" = "inherit";

    try {
        if (stdout) {
            fs.mkdirSync(path.dirname(stdout.file), { recursive: true });
            stdoutFd = fs.openSync(stdout.file, stdout.mode);
        }
        if (stderr) {
            fs.mkdirSync(path.dirname(stderr.file), { recursive: true });
            stderrFd = fs.openSync(stderr.file, stderr.mode);
        }

        execFileSync(cmd, cleanArgs, {
            stdio: ["inherit", stdoutFd, stderrFd],
        });
    } catch {
        // Process error output is written automatically to stderrFd
    } finally {
        if (typeof stdoutFd === "number") fs.closeSync(stdoutFd);
        if (typeof stderrFd === "number") fs.closeSync(stderrFd);
    }
}