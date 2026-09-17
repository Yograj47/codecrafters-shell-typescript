export function parseToken(line: string): string[] {
    const tokens: string[] = [];
    let currentArg = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === "\\" && !inSingleQuote) {
            if (i + 1 < line.length) {
                const nextChar = line[i + 1];
                if (inDoubleQuote) {
                    if (nextChar === '"' || nextChar === "\\") {
                        i++;
                        currentArg += nextChar;
                    } else {
                        currentArg += char;
                    }
                } else {
                    i++;
                    currentArg += nextChar;
                }
            } else {
                currentArg += char;
            }
        } else if (char === "'") {
            if (!inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            } else {
                currentArg += char;
            }
        } else if (char === '"') {
            if (!inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            } else {
                currentArg += char;
            }
        } else if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
            if (currentArg.length > 0) {
                tokens.push(currentArg);
                currentArg = "";
            }
        } else {
            currentArg += char;
        }
    }

    if (currentArg.length > 0) {
        tokens.push(currentArg);
    }

    return tokens;
}