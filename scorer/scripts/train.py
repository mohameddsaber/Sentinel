import json
import os
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from optimum.onnxruntime import ORTModelForSequenceClassification
import numpy as np

# 1. Load Data
dataset_path = "../data/scorer_dataset.json"
with open(dataset_path, "r") as f:
    raw_data = json.load(f)

# The dataset currently has "allow", "block", "uncertain"
# Let's map them to: 0 -> block, 1 -> allow, 2 -> uncertain (optional)
# But actually, the JS scorer expects a confidence score for "productive" vs "unproductive".
# Let's simplify and drop "uncertain", or map "allow" -> 1, "block" -> 0, "uncertain" -> 0 (or drop them)
# For simplicity, let's keep all 3 classes:
label_map = {"block": 0, "allow": 1, "uncertain": 2}
id2label = {0: "block", 1: "allow", 2: "uncertain"}
label2id = {"block": 0, "allow": 1, "uncertain": 2}

texts = [item["candidate"] for item in raw_data]
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
    num_train_epochs=10, 
    per_device_train_batch_size=8,
    learning_rate=3e-5,
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    save_total_limit=2
)

from transformers import EarlyStoppingCallback

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

# Export
ort_model = ORTModelForSequenceClassification.from_pretrained(output_dir, export=True)
ort_model.save_pretrained(onnx_output_dir)

# Quantize
quantizer = ORTQuantizer.from_pretrained(onnx_output_dir)
dqconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
quantizer.quantize(
    save_dir=onnx_output_dir,
    quantization_config=dqconfig,
)

tokenizer.save_pretrained(onnx_output_dir)
print(f"Quantized ONNX model saved to {onnx_output_dir}")
