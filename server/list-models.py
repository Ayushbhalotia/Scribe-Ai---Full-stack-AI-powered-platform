import os
import google.generativeai as genai
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
for m in genai.list_models():
    print(f"Name: {m.name}")
