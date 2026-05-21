// In the browser, we use the CDN for transformers.js to avoid path resolution issues with node_modules
// In Node.js, we use the local package.
const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2";

let classifierPromise = null;
let transformersModulePromise = null;

const LOCAL_MODEL_ID = "custom-model";
const LOCAL_MODEL_ROOT = new URL("./", import.meta.url).href;

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

      // Dynamic import from CDN for browser
      return import(TRANSFORMERS_CDN);
    })().catch((error) => {
      transformersModulePromise = null;
      throw error;
    });
  }

  return transformersModulePromise;
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = getTransformersModule()
      .then(({ env, pipeline }) => {
        configureTransformersEnvironment(env);
        return pipeline("text-classification", LOCAL_MODEL_ID, {
          local_files_only: true,
          dtype: "q8"
        });
      })
      .catch((error) => {
        classifierPromise = null;
        throw error;
      });
  }

  return classifierPromise;
}

async function classify(text) {
  if (typeof text !== "string") {
    throw new TypeError("classify(text) expects a string.");
  }

  if (!text.trim()) {
    return [];
  }

  const classifier = await getClassifier();
  const output = await classifier(text);
  
  return output;
}

function configureTransformersEnvironment(env) {
  if (!env || IS_NODE_RUNTIME) {
    return;
  }

  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = LOCAL_MODEL_ROOT;

  // Set the WASM paths to the correct CDN location for Transformers.js v3
  // This avoids the 404 error when looking for ort-wasm-*.wasm files.
  env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2/dist/";

  if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.numThreads = 1;
  }
}

export {
  getClassifier,
  classify
};
