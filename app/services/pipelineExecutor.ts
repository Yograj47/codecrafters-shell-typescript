import { spawn } from "node:child_process";

export async function executePipeline(
    leftTokens: string[],
    rightTokens: string[]
): Promise<void> {
    const leftCmd = leftTokens[0];
    const leftArgs = leftTokens.slice(1);

    const rightCmd = rightTokens[0];
    const rightArgs = rightTokens.slice(1);

    return new Promise((resolve, reject) => {
        // 1. Spawn Left Command: stdout is a PIPE
        const p1 = spawn(leftCmd, leftArgs, {
            stdio: ["inherit", "pipe", "inherit"],
        });

        // 2. Spawn Right Command: stdin is a PIPE
        const p2 = spawn(rightCmd, rightArgs, {
            stdio: ["pipe", "inherit", "inherit"],
        });

        // 3. Pipe stdout of p1 directly into stdin of p2
        if (p1.stdout && p2.stdin) {
            p1.stdout.pipe(p2.stdin);
        }

        // 4. Track completion of both processes
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