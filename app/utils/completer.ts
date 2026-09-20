const BUILTINS = ["echo", "exit", "type", "pwd", "cd"];

export function completer(line: string): [string[], string] {
    const candidates = BUILTINS.map((cmd) => cmd + " ");

    const hits = candidates.filter((cmd) => cmd.startsWith(line));

    return [hits, line];
}