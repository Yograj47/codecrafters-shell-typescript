import { spawn } from "node:child_process";
import { parseRedirections, prepareRedirectionFiles } from "../utils/redirection";
import { BUILTIN_COMMANDS, runBuiltinToString } from "../commands/builtins";

function isBuiltin(cmd: string): boolean {
    return BUILTIN_COMMANDS.includes(cmd as any);
}

export async function executePipeline(
    leftTokens: string[],
    rightTokens: string[]
): Promise<void> {
    const leftRedir = parseRedirections(leftTokens.slice(1));
    const rightRedir = parseRedirections(rightTokens.slice(1));

    prepareRedirectionFiles(leftRedir);
    prepareRedirectionFiles(rightRedir);

    const leftCmd = leftTokens[0];
    const leftArgs = leftRedir.cleanArgs;

    const rightCmd = rightTokens[0];
    const rightArgs = rightRedir.cleanArgs;

    const isLeftBuiltin = isBuiltin(leftCmd);
    const isRightBuiltin = isBuiltin(rightCmd);

    // Case 1: Built-in | External (e.g., echo apple-orange | wc)
    if (isLeftBuiltin && !isRightBuiltin) {
        return new Promise((resolve, reject) => {
            const p2 = spawn(rightCmd, rightArgs, {
                stdio: ["pipe", "inherit", "inherit"],
            });

            const output = runBuiltinToString(leftCmd, leftArgs);

            if (p2.stdin) {
                p2.stdin.write(output);
                p2.stdin.end(); // EOF tells p2 no more input is coming
            }

            p2.on("close", resolve);
            p2.on("error", reject);
        });
    }

    // Case 2: External | Built-in (e.g., ls | type exit)
    if (!isLeftBuiltin && isRightBuiltin) {
        return new Promise((resolve, reject) => {
            const p1 = spawn(leftCmd, leftArgs, {
                stdio: ["inherit", "ignore", "inherit"], // Ignores p1 stdout
            });

            const output = runBuiltinToString(rightCmd, rightArgs);
            if (output) {
                process.stdout.write(output);
            }

            p1.on("close", resolve);
            p1.on("error", reject);
        });
    }

    // Case 3: Built-in | Built-in (e.g., echo hello | type exit)
    if (isLeftBuiltin && isRightBuiltin) {
        const output = runBuiltinToString(rightCmd, rightArgs);
        if (output) {
            process.stdout.write(output);
        }
        return;
    }

    // Case 4: External | External (e.g., cat file | wc)
    return new Promise((resolve, reject) => {
        const p1 = spawn(leftCmd, leftArgs, {
            stdio: ["inherit", "pipe", "inherit"],
        });

        const p2 = spawn(rightCmd, rightArgs, {
            stdio: ["pipe", "inherit", "inherit"],
        });

        if (p1.stdout && p2.stdin) {
            p1.stdout.pipe(p2.stdin);
        }

        let p1Done = false;
        let p2Done = false;

        function checkDone() {
            if (p1Done && p2Done) {
                resolve();
            }
        }

        p1.on("close", () => {
            p1Done = true;
            checkDone();
        });

        p2.on("close", () => {
            p2Done = true;
            checkDone();
        });

        p1.on("error", reject);
        p2.on("error", reject);
    });
}