import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { RedirectionInfo } from "../utils/redirection";
import { addJob } from "./jobManager";

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

            // Track if cleanup was already executed to prevent double closing EBADF errors
            let cleanedUp = false;
            const cleanup = () => {
                if (cleanedUp) return;
                cleanedUp = true;
                if (typeof stdoutFd === "number") {
                    try { fs.closeSync(stdoutFd); } catch { }
                }
                if (typeof stderrFd === "number") {
                    try { fs.closeSync(stderrFd); } catch { }
                }
            };

            if (isBackground) {
                const fullCmd = [cmd, ...cleanArgs].join(" ");
                const job = addJob(fullCmd, child);
                process.stdout.write(`[${job.id}] ${child.pid}\n`);

                // Close parent descriptors after child process exits in background
                child.on("close", cleanup);
                child.on("error", cleanup);

                resolve(); // Return instantly so prompt prints right away for background job
            } else {
                child.on("close", () => {
                    cleanup();
                    resolve(); // Resolve only after foreground job finishes completely
                });

                child.on("error", () => {
                    cleanup();
                    resolve();
                });
            }
        } catch {
            if (typeof stdoutFd === "number") {
                try { fs.closeSync(stdoutFd); } catch { }
            }
            if (typeof stderrFd === "number") {
                try { fs.closeSync(stderrFd); } catch { }
            }
            resolve();
        }
    });
}