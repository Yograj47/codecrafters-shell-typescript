import { spawn, type ChildProcess } from "node:child_process";
import { parseRedirections, prepareRedirectionFiles } from "../utils/redirection";
import { BUILTIN_COMMANDS, runBuiltinToString } from "../commands/builtins";

function isBuiltin(cmd: string): boolean {
    return BUILTIN_COMMANDS.includes(cmd as any);
}

export async function executePipeline(stages: string[][]): Promise<void> {
    const processes: ChildProcess[] = [];

    return new Promise((resolve, reject) => {
        let previousOutput: any = null; // Stream or string output from previous stage

        for (let i = 0; i < stages.length; i++) {
            const stageTokens = stages[i];
            const redirectionInfo = parseRedirections(stageTokens.slice(1));
            prepareRedirectionFiles(redirectionInfo);

            const cmd = stageTokens[0];
            const args = redirectionInfo.cleanArgs;
            const isLast = i === stages.length - 1;
            const stageIsBuiltin = isBuiltin(cmd);

            if (stageIsBuiltin) {
                const builtinOutput = runBuiltinToString(cmd, args);

                if (isLast) {
                    if (builtinOutput) {
                        process.stdout.write(builtinOutput);
                    }
                } else {
                    // Pass string output as input for the next stage
                    previousOutput = builtinOutput;
                }
            } else {
                // External process execution
                const stdinSetting = previousOutput ? "pipe" : "inherit";
                const stdoutSetting = isLast ? "inherit" : "pipe";

                const proc = spawn(cmd, args, {
                    stdio: [stdinSetting, stdoutSetting, "inherit"],
                });

                processes.push(proc);

                // Connect previous stage output to current process stdin
                if (previousOutput) {
                    if (typeof previousOutput === "string") {
                        if (proc.stdin) {
                            proc.stdin.write(previousOutput);
                            proc.stdin.end();
                        }
                    } else if (proc.stdin) {
                        previousOutput.pipe(proc.stdin);
                    }
                }

                previousOutput = proc.stdout;
            }
        }

        // If no external processes were spawned (e.g., echo hi | type exit), resolve immediately
        if (processes.length === 0) {
            resolve();
            return;
        }

        // Wait for all spawned processes to close
        let completedCount = 0;
        for (const proc of processes) {
            proc.on("close", () => {
                completedCount++;
                if (completedCount === processes.length) {
                    resolve();
                }
            });
            proc.on("error", reject);
        }
    });
}