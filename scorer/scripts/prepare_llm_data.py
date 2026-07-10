import json
import os
import glob
import random

def prepare_llm_data():
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    scraped_files_pattern = os.path.join(data_dir, "scraped_youtube_videos*.json")
    train_output_path = os.path.join(data_dir, "training.json")
    test_output_path = os.path.join(data_dir, "test.json")

    # 1. Load all scraped data
    scraped_files = glob.glob(scraped_files_pattern)
    all_data_by_zone = {}
    
    # Track unique video IDs to deduplicate globally
    seen_video_ids = set()
    total_scraped_items = 0

    for file_path in scraped_files:
        with open(file_path, "r") as f:
            try:
                content = json.load(f)
                for zone, queries in content.items():
                    if zone not in all_data_by_zone:
                        all_data_by_zone[zone] = []
                    
                    for query_data in queries:
                        videos = query_data.get("videos", [])
                        for v in videos:
                            total_scraped_items += 1
                            video_id = v.get("videoId")
                            if video_id and video_id not in seen_video_ids:
                                seen_video_ids.add(video_id)
                                # Format for prompt.txt
                                formatted_video = {
                                    "title": v.get("title", ""),
                                    "category": v.get("category", ""),
                                    "channel": v.get("channelName", ""),
                                    "videoId": video_id # Keep for reference during split, remove before saving if needed
                                }
                                all_data_by_zone[zone].append(formatted_video)
            except json.JSONDecodeError:
                print(f"Error parsing {file_path}. Skipping.")

    print(f"Total items scraped: {total_scraped_items}")
    print(f"Unique items after deduplication: {len(seen_video_ids)}")

    # 2. Stratified Split by Zone
    train_list = []
    test_list = []
    
    random.seed(42) # For reproducibility

    for zone, videos in all_data_by_zone.items():
        random.shuffle(videos)
        split_idx = int(len(videos) * 0.8)
        
        zone_train = videos[:split_idx]
        zone_test = videos[split_idx:]
        
        train_list.extend(zone_train)
        test_list.extend(zone_test)
        
        print(f"Zone '{zone}': {len(videos)} unique videos. Split: {len(zone_train)} train, {len(zone_test)} test.")

    # 3. Final Shuffle
    random.shuffle(train_list)
    random.shuffle(test_list)

    # 4. Remove videoId before saving (keep clean for LLM)
    def clean_for_output(video_list):
        return [
            {
                "title": v["title"],
                "category": v["category"],
                "channel": v["channel"]
            }
            for v in video_list
        ]

    final_train = clean_for_output(train_list)
    final_test = clean_for_output(test_list)

    # 5. Save
    with open(train_output_path, "w") as f:
        json.dump(final_train, f, indent=2)
    
    with open(test_output_path, "w") as f:
        json.dump(final_test, f, indent=2)

    print("-" * 30)
    print(f"Preparation Complete!")
    print(f"Saved {len(final_train)} items to {train_output_path}")
    print(f"Saved {len(final_test)} items to {test_output_path}")

if __name__ == "__main__":
    prepare_llm_data()
