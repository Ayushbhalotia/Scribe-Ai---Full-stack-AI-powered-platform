import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello',
        });
        console.log("Success with gemini-2.5-flash:", response.text);
    } catch (e) {
        console.log("Error 2.5:", e.message);
    }
    
    try {
        const response2 = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Hello',
        });
        console.log("Success with gemini-1.5-flash:", response2.text);
    } catch (e) {
        console.log("Error 1.5:", e.message);
    }

    try {
        const response3 = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Hello',
        });
        console.log("Success with gemini-2.0-flash:", response3.text);
    } catch (e) {
        console.log("Error 2.0:", e.message);
    }
}
run();
