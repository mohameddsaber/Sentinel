import json
import os
import re
import numpy as np
from transformers import AutoTokenizer, pipeline
from optimum.onnxruntime import ORTModelForSequenceClassification
from sklearn.metrics import confusion_matrix, classification_report

# --- Settings ---
os.environ["OMP_NUM_THREADS"] = "1"

TEST_DATA_PATH = "../data/test.json"
MODEL_DIR = "../src/custom-model"
QUANT_MODEL_PATH = "../src/custom-model/onnx"

def normalize_text(text):
    if not isinstance(text, str): return ""
    text = text.lower().strip().replace("&", " and ")
    text = re.sub(r'[`"\'“”‘’()[\]{}<>|]', ' ', text)
    text = re.sub(r'[^a-z0-9+#./_\-\s]', ' ', text)
    text = re.sub(r'([a-z0-9+#])([./_\-])([a-z0-9+#])', r'\1 \3', text)
    return re.sub(r'\s+', ' ', text).strip()

def print_cm(cm, labels):
    # Header
    title_text = "Actual \\ Pred"
    header = f"{title_text:<15}"
    for label in labels:
        header += f"| {label:<10}"
    print(header)
    print("-" * len(header))
    
    # Rows
    for i, label in enumerate(labels):
        row = f"{label:<15}"
        for j in range(len(labels)):
            row += f"| {cm[i, j]:<10}"
        print(row)

def run_evaluation():
    print(f"Loading test data from {TEST_DATA_PATH}...")
    with open(TEST_DATA_PATH, "r") as f:
        test_data = json.load(f)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    
    print("Loading Models...")
    model_fp32 = ORTModelForSequenceClassification.from_pretrained(MODEL_DIR, file_name="model.onnx")
    pipe_fp32 = pipeline("text-classification", model=model_fp32, tokenizer=tokenizer)

    model_q8 = ORTModelForSequenceClassification.from_pretrained(QUANT_MODEL_PATH, file_name="model_quantized.onnx")
    pipe_q8 = pipeline("text-classification", model=model_q8, tokenizer=tokenizer)

    y_true = [item["label"] for item in test_data]
    y_pred_fp32 = []
    y_pred_q8 = []

    print(f"Evaluating {len(test_data)} items...")
    for item in test_data:
        text = normalize_text(item["candidate"])
        y_pred_fp32.append(pipe_fp32(text)[0]["label"])
        y_pred_q8.append(pipe_q8(text)[0]["label"])

    labels = ["allow", "block", "uncertain"]
    
    print("\n" + "="*30)
    print("CONFUSION MATRIX: FULL PRECISION (FP32)")
    print("="*30)
    cm_fp32 = confusion_matrix(y_true, y_pred_fp32, labels=labels)
    print_cm(cm_fp32, labels)
    print("\nClassification Report (FP32):")
    print(classification_report(y_true, y_pred_fp32, labels=labels))

    print("\n" + "="*30)
    print("CONFUSION MATRIX: QUANTIZED (Q8)")
    print("="*30)
    cm_q8 = confusion_matrix(y_true, y_pred_q8, labels=labels)
    print_cm(cm_q8, labels)
    print("\nClassification Report (Q8):")
    print(classification_report(y_true, y_pred_q8, labels=labels))

if __name__ == "__main__":
    run_evaluation()
