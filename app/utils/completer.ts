const BUILTINS = ["echo", "exit", "type", "pwd", "cd"];

export function completer(line: string): [string[], string] {
    const candidates = BUILTINS.map((cmd) => cmd + " ");

    const hits = candidates.filter((cmd) => cmd.startsWith(line));

    if (hits.length === 0) {
        process.stdout.write("\x07");
        return [[], line];
    }

    return [hits, line];
}