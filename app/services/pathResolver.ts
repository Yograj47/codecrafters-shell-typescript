import * as path from "node:path";
import * as fs from "node:fs";

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