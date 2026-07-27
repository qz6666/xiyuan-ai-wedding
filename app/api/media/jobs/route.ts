import { jsonResponse } from "../../ai-providers";
import { listVideoJobs } from "../video-jobs";

export async function GET(request: Request) {
  const jobs = await listVideoJobs(request);
  return jsonResponse({
    jobs,
    recoverable: jobs.filter(
      (job) => job.status === "queued" || job.status === "in_progress",
    ).length,
  });
}
