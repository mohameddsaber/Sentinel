import json
import os
import re

# --- Mac Safety Settings ---
# Prevents mutex locks and freezes on macOS (especially Apple Silicon)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import EarlyStoppingCallback
import numpy as np

def normalize_text(text):
    if not isinstance(text, str):
        return ""
    
    # Lowercase and trim
    text = text.normalize("NFKC").lower().strip() if hasattr(text, "normalize") else text.lower().strip()
    
    # Replace & with and
    text = text.replace("&", " and ")
    
    # Replace common separators with spaces
    text = re.sub(r'[`"\'“”‘’()[\]{}<>|]', ' ', text)
    
    # Replace non-alphanumeric (keeping some technical chars)
    text = re.sub(r'[^a-z0-9+#./_\-\s]', ' ', text)
    
    # Split technical separators (approximate JS splitTechnicalSeparators)
    text = re.sub(r'([a-z0-9+#])([./_\-])([a-z0-9+#])', r'\1 \3', text)
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

# 1. Load Data
dataset_path = "../data/scorer_dataset.json"
with open(dataset_path, "r") as f:
    raw_data = json.load(f)

label_map = {"block": 0, "allow": 1, "uncertain": 2}
id2label = {0: "block", 1: "allow", 2: "uncertain"}
label2id = {"block": 0, "allow": 1, "uncertain": 2}

# Apply normalization during data loading to match browser preprocessing
texts = [normalize_text(item["candidate"]) for item in raw_data]
labels = [label_map[item["label"]] for item in raw_data]

dataset = Dataset.from_dict({"text": texts, "label": labels})

# 2. Tokenizer & Model
model_id = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(
    model_id, 
    num_labels=3,
    id2label=id2label,
    label2id=label2id
)

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=64)

# Add validation split (20%)
dataset = dataset.train_test_split(test_size=0.2, seed=42)
tokenized_datasets = dataset.map(tokenize_function, batched=True)

# 3. Train
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=15, 
    per_device_train_batch_size=16,
    learning_rate=2e-5, # Slightly lower for stability
    weight_decay=0.01, # Prevents memorization
    label_smoothing_factor=0.1, # Prevents overconfidence/peaky math
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    save_total_limit=2
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
)

print(f"Starting training with {model_id}...")
trainer.train()

# 4. Save PyTorch Model
output_dir = "../src/custom-model-pt"
model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)
print(f"PyTorch model saved to {output_dir}")

# 5. Export to ONNX and Quantize
from optimum.onnxruntime import ORTQuantizer, ORTModelForSequenceClassification
from optimum.onnxruntime.configuration import AutoQuantizationConfig

onnx_output_dir = "../src/custom-model"
print("Exporting to ONNX and Quantizing...")

# Export Full Precision
ort_model = ORTModelForSequenceClassification.from_pretrained(output_dir, export=True)
ort_model.save_pretrained(onnx_output_dir)

# Quantize to INT8
quantizer = ORTQuantizer.from_pretrained(onnx_output_dir)
dqconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
quantizer.quantize(
    save_dir=os.path.join(onnx_output_dir, "onnx"),
    quantization_config=dqconfig,
)

# Save tokenizer to both locations
tokenizer.save_pretrained(onnx_output_dir)
tokenizer.save_pretrained(os.path.join(onnx_output_dir, "onnx"))

print(f"Full and Quantized ONNX models saved to {onnx_output_dir}")
