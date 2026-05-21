import json
import os
import time
import re
from transformers import AutoTokenizer, pipeline
from optimum.onnxruntime import ORTModelForSequenceClassification

# --- Settings ---
os.environ["OMP_NUM_THREADS"] = "1" # Mac safety

TEST_DATA_PATH = "../data/test.json"
MODEL_DIR = "../src/custom-model"
QUANT_MODEL_PATH = "../src/custom-model/onnx" # Should contain model_quantized.onnx

def normalize_text(text):
    if not isinstance(text, str): return ""
    text = text.lower().strip()
    text = text.replace("&", " and ")
    text = re.sub(r'[`"\'“”‘’()[\]{}<>|]', ' ', text)
    text = re.sub(r'[^a-z0-9+#./_\-\s]', ' ', text)
    text = re.sub(r'([a-z0-9+#])([./_\-])([a-z0-9+#])', r'\1 \3', text)
    return re.sub(r'\s+', ' ', text).strip()

def evaluate():
    print(f"Loading test data from {TEST_DATA_PATH}...")
    with open(TEST_DATA_PATH, "r") as f:
        test_data = json.load(f)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    
    print("Loading Full Precision Model (FP32)...")
    model_fp32 = ORTModelForSequenceClassification.from_pretrained(MODEL_DIR, file_name="model.onnx")
    pipe_fp32 = pipeline("text-classification", model=model_fp32, tokenizer=tokenizer)

    print("Loading Quantized Model (INT8)...")
    model_q8 = ORTModelForSequenceClassification.from_pretrained(QUANT_MODEL_PATH, file_name="model_quantized.onnx")
    pipe_q8 = pipeline("text-classification", model=model_q8, tokenizer=tokenizer)

    results = {
        "fp32": {"correct": 0, "total_confidence": 0, "total_time": 0},
        "q8": {"correct": 0, "total_confidence": 0, "total_time": 0}
    }

    print("-" * 50)
    print(f"{'Text':<40} | {'Label':<8} | {'FP32 Result':<15} | {'Q8 Result':<15}")
    print("-" * 100)

    for item in test_data:
        text = normalize_text(item["candidate"])
        expected = item["label"]

        # Run FP32
        start = time.time()
        res_fp32 = pipe_fp32(text)[0]
        results["fp32"]["total_time"] += (time.time() - start)
        results["fp32"]["total_confidence"] += res_fp32["score"]
        if res_fp32["label"] == expected: results["fp32"]["correct"] += 1

        # Run Q8
        start = time.time()
        res_q8 = pipe_q8(text)[0]
        results["q8"]["total_time"] += (time.time() - start)
        results["q8"]["total_confidence"] += res_q8["score"]
        if res_q8["label"] == expected: results["q8"]["correct"] += 1

        print(f"{text[:37]+'...':<40} | {expected:<8} | {res_fp32['label']+' ('+str(round(res_fp32['score'],2))+')':<15} | {res_q8['label']+' ('+str(round(res_q8['score'],2))+')':<15}")

    total = len(test_data)
    print("-" * 100)
    print(f"RESULTS FOR {total} ITEMS:")
    for key in ["fp32", "q8"]:
        acc = (results[key]["correct"] / total) * 100
        avg_conf = (results[key]["total_confidence"] / total) * 100
        avg_time = (results[key]["total_time"] / total) * 1000
        print(f"{key.upper():<5} -> Accuracy: {acc:>6.1f}% | Avg Confidence: {avg_conf:>6.1f}% | Avg Latency: {avg_time:>6.2f}ms")

if __name__ == "__main__":
    evaluate()
