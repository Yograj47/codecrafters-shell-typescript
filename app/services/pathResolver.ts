import * as path from "node:path";
import * as fs from "node:fs";

export function getExecutablesFromPath(): string[] {
    const pathEnv = process.env.PATH || "";
    const dirs = pathEnv.split(path.delimiter);
    const executables = new Set<string>();

    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) continue;

            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isFile() && !!(fs.constants.X_OK & stats.mode)) {
                        executables.add(file);
                    }
                } catch {
                    // Ignore inaccessible files or broken symlinks
                }
            }
        } catch {
            // Ignore unreadable PATH directories
        }
    }

    return Array.from(executables);
}

export function searchPath(command: string): string | null {
    const pathEnv = process.env.PATH || "";
    const folder = pathEnv.split(path.delimiter).find((dir) => {
        const fullPath = path.join(dir, command);
        try {
            if (!fs.existsSync(fullPath)) return false;
            const stats = fs.statSync(fullPath);
            return !!(fs.constants.X_OK & stats.mode);
        } catch {
            return false;
        }
    });

    return folder ? path.join(folder, command) : null;
}