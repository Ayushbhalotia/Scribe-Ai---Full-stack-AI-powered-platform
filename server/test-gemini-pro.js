import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-3.5-flash" });
        const response = await model.generateContent("Hello");
        console.log("Success with gemini-3.5-flash:", response.response.text());
    } catch (e) {
        console.log("Error gemini-3.5-flash:", e.message);
    }
}
run();
