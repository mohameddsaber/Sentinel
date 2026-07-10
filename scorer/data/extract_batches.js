import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractBatches(filename, outputFolder, batchSize = 100) {
    const filePath = path.join(__dirname, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Find all items that don't have a classification yet
    const unlabeled = data.filter(item => !item.classification);
    
    console.log(`${filename}: Found ${unlabeled.length} unlabeled items out of ${data.length} total.`);
    
    const outputDir = path.join(__dirname, outputFolder);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const baseName = path.basename(filename, '.json');
    let batchIndex = 1;
    
    for (let i = 0; i < unlabeled.length; i += batchSize) {
        const batch = unlabeled.slice(i, i + batchSize);
        const batchFileName = path.join(outputDir, `${baseName}_unlabeled_batch_${batchIndex}.json`);
        
        fs.writeFileSync(batchFileName, JSON.stringify(batch, null, 2), 'utf8');
        batchIndex++;
    }
    
    console.log(`${filename}: Created ${batchIndex - 1} batches of ${batchSize} items in ${outputFolder}/`);
}

extractBatches('training.json', 'training_batches');
extractBatches('test.json', 'test_batches');
