import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env.local");
}

if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

console.log(`Checking models for Key starting with: ${apiKey.substring(0, 4)}...`);

async function checkModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const err = await response.text();
            console.error(`API Request Failed: ${response.status} ${response.statusText}`);
            console.error(err);
            return;
        }

        const data = await response.json();
        console.log("Successfully connected! Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
                }
            });
        } else {
            console.log("No models found in response.");
        }

    } catch (error) {
        console.error("Network Error:", error.message);
    }
}

checkModels();
