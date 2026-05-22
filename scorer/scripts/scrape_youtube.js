import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import queries from '../data/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.API_KEY;
const MAX_RESULTS_PER_QUERY = 50; // adjust as needed

if (!API_KEY) {
  console.error("Please set the YOUTUBE_API_KEY environment variable.");
  process.exit(1);
}

// Maps category ID to category name
let categoryCache = {};

async function fetchCategories() {
  console.log("Fetching YouTube categories...");
  const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }
  const data = await response.json();
  for (const item of data.items) {
    categoryCache[item.id] = item.snippet.title;
  }
}

async function searchVideosForQuery(query) {
  console.log(`Searching for: "${query}"`);
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.append("part", "snippet");
  url.searchParams.append("type", "video");
  url.searchParams.append("q", query);
  url.searchParams.append("maxResults", MAX_RESULTS_PER_QUERY);
  url.searchParams.append("key", API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`Search failed for "${query}": ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  const videoIds = data.items.map(item => item.id.videoId);

  if (videoIds.length === 0) return [];

  return await fetchVideoDetails(videoIds);
}

async function fetchVideoDetails(videoIds) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.append("part", "snippet");
  url.searchParams.append("id", videoIds.join(','));
  url.searchParams.append("key", API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`Video details fetch failed: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.items.map(item => {
    const categoryId = item.snippet.categoryId;
    return {
      videoId: item.id,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      category: categoryCache[categoryId] || `Unknown (ID: ${categoryId})`
    };
  });
}

async function main() {
  await fetchCategories();

  const results = {};

  for (const [zone, zoneQueries] of Object.entries(queries)) {
    console.log(`\n=== Processing zone: ${zone} ===`);
    results[zone] = [];

    for (const query of zoneQueries) {
      try {
        const videos = await searchVideosForQuery(query);
        results[zone].push({
          query,
          videos
        });

        // Sleep to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing query "${query}":`, error);
      }
    }
  }

  const outputPath = path.join(__dirname, '../data/scraped_youtube_videos.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDone! Results saved to ${outputPath}`);
}

main().catch(console.error);
