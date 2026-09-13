import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

const KNOWN_CMDS: Record<string, (str: string) => void> = {
  'echo': (str: string) => console.log(str),
  'type': (str: string): void => {
    if (KNOWN_CMDS[str] || str === 'exit') {
      console.log(`${str} is a shell builtin`);
    } else {
      console.log(`${str}: not found`);
    }
  },
  'invalidCmd': (cmd: string) => console.log(`${cmd}: command not found`),
};

rl.on("line", (command) => {
  const [cmd, ...input] = command.split(' ');
  const inputString = input.join(' ');

  if (command === "exit") {
    rl.close();
    return;
  }

  const ansFn = KNOWN_CMDS[cmd];

  if (!ansFn) {
    KNOWN_CMDS['invalidCmd'](command);
  } else {
    ansFn(inputString);
  }

  rl.prompt();
});