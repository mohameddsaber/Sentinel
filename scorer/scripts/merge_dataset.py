import json
import os
import glob

def merge_datasets():
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    main_dataset_path = os.path.join(data_dir, "scorer_dataset.json")
    batches_pattern = os.path.join(data_dir, "scorer_dataset_batch*.json")

    # 1. Load existing main dataset
    if os.path.exists(main_dataset_path):
        with open(main_dataset_path, "r") as f:
            try:
                merged_data = json.load(f)
            except json.JSONDecodeError:
                merged_data = []
    else:
        merged_data = []

    print(f"Loaded {len(merged_data)} items from main dataset.")

    # 2. Find and load all batch files
    batch_files = glob.glob(batches_pattern)
    new_items_count = 0

    for batch_file in batch_files:
        with open(batch_file, "r") as f:
            try:
                batch_content = json.load(f)
                if isinstance(batch_content, list):
                    merged_data.extend(batch_content)
                    new_items_count += len(batch_content)
                    print(f"Added {len(batch_content)} items from {os.path.basename(batch_file)}")
            except json.JSONDecodeError:
                print(f"Error: Could not parse {batch_file}. Skipping.")

    # 3. Remove Duplicates
    # We use a dictionary keyed by the 'candidate' text to ensure uniqueness
    unique_data = {}
    for item in merged_data:
        candidate = item.get("candidate", "").strip()
        if candidate:
            # If duplicate found, we keep the one already in the dict (first seen)
            if candidate not in unique_data:
                unique_data[candidate] = item

    final_list = list(unique_data.values())
    duplicates_removed = (len(merged_data)) - len(final_list)

    # 4. Save the result
    with open(main_dataset_path, "w") as f:
        json.dump(final_list, f, indent=2)

    print("-" * 30)
    print(f"Merge Complete!")
    print(f"Total items: {len(final_list)}")
    print(f"Duplicates removed: {duplicates_removed}")
    print(f"Saved to: {main_dataset_path}")

if __name__ == "__main__":
    merge_datasets()
