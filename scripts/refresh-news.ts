import { refreshNews } from "@/lib/news/refreshPipeline";

refreshNews()
  .then((result) => {
    console.log(
      `Refreshed TechEveryday: ${result.candidateCount} candidates (${result.sourceBreakdown.rss} RSS, ${result.sourceBreakdown.arxiv} arXiv, ${result.sourceBreakdown.x} X).`
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
