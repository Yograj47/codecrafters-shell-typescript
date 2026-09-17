export interface RedirectionInfo {
    cleanArgs: string[];
    stdoutFile?: string;
    stderrFile?: string;
}

export function parseRedirections(args: string[]): RedirectionInfo {
    const cleanArgs: string[] = [];
    let stdoutFile: string | undefined;
    let stderrFile: string | undefined;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === ">" || arg === "1>") {
            stdoutFile = args[i + 1];
            i++;
        } else if (arg === "2>") {
            stderrFile = args[i + 1];
            i++;
        } else {
            cleanArgs.push(arg);
        }
    }

    return { cleanArgs, stdoutFile, stderrFile };
}