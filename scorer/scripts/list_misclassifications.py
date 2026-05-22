import json
import os
import re
from transformers import AutoTokenizer, pipeline
from optimum.onnxruntime import ORTModelForSequenceClassification

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

def run_misclassifications():
    with open(TEST_DATA_PATH, "r") as f:
        test_data = json.load(f)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model_fp32 = ORTModelForSequenceClassification.from_pretrained(MODEL_DIR, file_name="model.onnx")
    pipe_fp32 = pipeline("text-classification", model=model_fp32, tokenizer=tokenizer)

    model_q8 = ORTModelForSequenceClassification.from_pretrained(QUANT_MODEL_PATH, file_name="model_quantized.onnx")
    pipe_q8 = pipeline("text-classification", model=model_q8, tokenizer=tokenizer)

    print("="*100)
    print(f"{'MISCLASSIFICATIONS REPORT':^100}")
    print("="*100)
    print(f"{'Text':<50} | {'Actual':<10} | {'FP32 Pred':<15} | {'Q8 Pred':<15}")
    print("-" * 100)

    total_mis = 0
    for item in test_data:
        text = normalize_text(item["candidate"])
        actual = item["label"]
        
        pred_fp32 = pipe_fp32(text)[0]
        pred_q8 = pipe_q8(text)[0]
        
        if pred_fp32["label"] != actual or pred_q8["label"] != actual:
            total_mis += 1
            text_disp = (text[:47] + "...") if len(text) > 47 else text
            fp32_disp = f"{pred_fp32['label']} ({pred_fp32['score']:.2f})"
            q8_disp = f"{pred_q8['label']} ({pred_q8['score']:.2f})"
            
            print(f"{text_disp:<50} | {actual:<10} | {fp32_disp:<15} | {q8_disp:<15}")

    print("-" * 100)
    print(f"Total items with at least one misclassification: {total_mis} out of {len(test_data)}")
    print("="*100)

if __name__ == "__main__":
    run_misclassifications()
