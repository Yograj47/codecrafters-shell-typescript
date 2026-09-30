import type { ChildProcess } from "node:child_process";

export interface Job {
    id: number;
    pid: number;
    command: string;
    process: ChildProcess;
    status: "Running" | "Done";
}

let activeJobs: Job[] = [];

export function addJob(cmd: string, child: ChildProcess): Job {
    const jobId = activeJobs.length + 1;
    const job: Job = {
        id: jobId,
        pid: child.pid!,
        command: cmd,
        process: child,
        status: 'Running'
    };

    child.on("exit", () => {
        job.status = "Done";
    })

    activeJobs.push(job);
    return job;
}

export function getJobs(): Job[] {
    const jobsToPrint = [...activeJobs];

    activeJobs = activeJobs.filter((job) => job.status === 'Running');
    return jobsToPrint;
}

export function reapCompletedJobs(): void {
    const doneJobs = activeJobs.filter((job) => job.status === "Done");

    if (doneJobs.length === 0) return;

    for (const doneJob of doneJobs) {
        const index = activeJobs.indexOf(doneJob);
        const count = activeJobs.length;

        let marker = " ";
        if (index === count - 1) {
            marker = "+";
        } else if (index === count - 2) {
            marker = "-";
        }

        const statusPadded = doneJob.status.padEnd(24, " ");

        process.stdout.write(
            `[${doneJob.id}]${marker}  ${statusPadded}${doneJob.command}\n`
        );
    }

    activeJobs = activeJobs.filter((job) => job.status === "Running");
}