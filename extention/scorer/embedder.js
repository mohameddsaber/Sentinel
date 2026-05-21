import * as transformersWebModule from "../node_modules/@huggingface/transformers/dist/transformers.min.js";

let extractorPromise = null;
let transformersModulePromise = null;

const LOCAL_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const LOCAL_MODEL_ROOT = new URL(
  "../node_modules/@huggingface/transformers/.cache/",
  import.meta.url
).href;

const IS_NODE_RUNTIME =
  typeof process !== "undefined" &&
  !!process.versions &&
  !!process.versions.node;

async function getTransformersModule() {
  if (!transformersModulePromise) {
    transformersModulePromise = (async () => {
      if (IS_NODE_RUNTIME) {
        return import("@huggingface/transformers");
      }

      return transformersWebModule;
    })().catch((error) => {
      transformersModulePromise = null;
      throw error;
    });
  }

  return transformersModulePromise;
}

async function getExtractor() {
  // Load the MiniLM pipeline on first use and reuse it afterwards.
  if (!extractorPromise) {
    extractorPromise = getTransformersModule()
      .then(({ env, pipeline }) => {
        configureTransformersEnvironment(env);
        return pipeline("feature-extraction", LOCAL_MODEL_ID, {
          local_files_only: true,
          dtype: "fp32"
        });
      })
      .catch((error) => {
        extractorPromise = null;
        throw error;
      });
  }

  return extractorPromise;
}

async function embed(text) {
  if (typeof text !== "string") {
    throw new TypeError("embed(text) expects a string.");
  }

  if (!text.trim()) {
    return [];
  }

  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true
  });

  return toFlatNumberArray(output);
}

function toFlatNumberArray(output) {
  if (output && output.data) {
    return Array.from(output.data, (value) => Number(value));
  }

  if (output && typeof output.tolist === "function") {
    return flattenNumericArray(output.tolist());
  }

  if (Array.isArray(output)) {
    return flattenNumericArray(output);
  }

  throw new TypeError("Unsupported embedding output format.");
}

function flattenNumericArray(value) {
  const flattened = [];
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push(current[index]);
      }
      continue;
    }

    const numericValue = Number(current);
    if (!Number.isFinite(numericValue)) {
      throw new TypeError("Embedding output contains non-numeric values.");
    }

    flattened.push(numericValue);
  }

  return flattened;
}

function configureTransformersEnvironment(env) {
  if (!env || IS_NODE_RUNTIME) {
    return;
  }

  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = LOCAL_MODEL_ROOT;

  if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    // In a MV3 service worker, setting wasmPaths forces onnxruntime-web down
    // a dynamic import path that Chrome rejects. Leave it unset so the bundled
    // service-worker-safe loader inside transformers picks the runtime module.
    delete env.backends.onnx.wasm.wasmPaths;
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.numThreads = 1;
  }
}

export {
  getExtractor,
  embed
};
