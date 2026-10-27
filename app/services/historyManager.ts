const commandHistory: string[] = [];

export function addHistory(command: string): void {
    const trimmed = command.trim();
    if (trimmed && commandHistory[commandHistory.length - 1] !== trimmed) {
        commandHistory.push(trimmed);
    }
}

export function getHistory(): string[] {
    return commandHistory;
}