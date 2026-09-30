import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { RedirectionInfo } from "../utils/redirection";
import { addJob } from "./jobManager";
import { resolve } from "node:dns";

export function executeExternal(
    cmd: string,
    { cleanArgs, stdout, stderr }: RedirectionInfo,
    isBackground: boolean = false
): Promise<void> {
    return new Promise((resolve) => {
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

            const child = spawn(cmd, cleanArgs, {
                stdio: ["inherit", stdoutFd, stderrFd],
            });

            const cleanup = () => {
                if (typeof stdoutFd === "number") fs.closeSync(stdoutFd);
                if (typeof stderrFd === "number") fs.closeSync(stderrFd);
            }

            if (isBackground) {
                const fullCmd = [cmd, ...cleanArgs].join(" ");
                const job = addJob(fullCmd, child);
                process.stdout.write(`[${job.id}] ${child.pid}\n`);
                cleanup();
                resolve();
            } else {
                child.on("close", () => {
                    cleanup();
                    resolve();
                });

                child.on("error", () => {
                    cleanup();
                    resolve();
                });
            }
        } catch {
            // Process error output is written automatically to stderrFd
        } finally {
            if (typeof stdoutFd === "number") fs.closeSync(stdoutFd);
            if (typeof stderrFd === "number") fs.closeSync(stderrFd);
            resolve();
        }
    });
}