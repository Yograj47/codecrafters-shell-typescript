import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

// TODO: Uncomment the code below to pass the first stage
rl.on("line", (command) => {
  console.log(command.toString());

  if (!command) {
    console.error(`${command} command not found`);

  }
})


rl.prompt();
