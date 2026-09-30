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