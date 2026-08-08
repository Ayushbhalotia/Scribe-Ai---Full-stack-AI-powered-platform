import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const models = await ai.models.list();
        for (const model of models) {
            console.log(model.name);
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
run();
