import os
import json
import base64
import io
import re

from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__, static_folder="static", static_url_path="")

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set!")

genai.configure(api_key=GEMINI_API_KEY)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/generate_card", methods=["POST"])
def generate_card():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    name = data.get("name", "Unbekannt")
    element = data.get("element", "Normal")
    description = data.get("description", "")
    special_ability = data.get("special_ability", "")
    weakness = data.get("weakness", "")

    # ── Step 1: Generate card stats via Gemini text model ──────────────
    text_prompt = f"""Du bist ein kreativer Pokémon-Karten-Designer.
Erstelle die Werte für eine Sammelkarte im Pokémon-Stil mit folgenden Angaben:

Name: {name}
Element/Typ: {element}
Beschreibung: {description}
Spezialfähigkeit: {special_ability}
Schwäche: {weakness}

Antworte NUR mit einem validen JSON-Objekt (ohne Markdown-Codeblocks) mit genau diesen Feldern:
{{
  "hp": <number 30-300>,
  "attack1_name": "<string>",
  "attack1_damage": <number>,
  "attack1_description": "<kurze Beschreibung>",
  "attack2_name": "<string>",
  "attack2_damage": <number>,
  "attack2_description": "<kurze Beschreibung>",
  "retreat_cost": <number 1-4>,
  "flavor_text": "<kurzer, lustiger Flavor-Text>"
}}
"""

    try:
        text_model = genai.GenerativeModel("gemini-2.0-flash")
        text_response = text_model.generate_content(text_prompt)
        raw_text = text_response.text.strip()

        # Strip potential markdown code fences
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        card_stats = json.loads(cleaned)
    except json.JSONDecodeError:
        return jsonify({"error": "Gemini returned invalid JSON for card stats", "raw": raw_text}), 502
    except Exception as e:
        return jsonify({"error": f"Text generation failed: {str(e)}"}), 502

    # ── Step 2: Generate card artwork via Gemini image model ──────────
    image_prompt = f"""Create a vibrant, detailed illustration for a Pokémon-style trading card.
The creature is called "{name}". It is of type "{element}".
Description: {description}
The art style should be colorful, dynamic, anime-inspired, similar to official Pokémon card illustrations.
Show ONLY the creature, no text, no card borders, no UI elements. Full-body portrait on a simple
background that matches the element type."""

    card_image_b64 = None
    try:
        image_model = genai.GenerativeModel("gemini-2.0-flash-preview-image-generation")
        image_response = image_model.generate_content(
            image_prompt,
            generation_config=genai.GenerationConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        # Extract image from response parts
        for part in image_response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data is not None:
                card_image_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                break
    except Exception as e:
        # Image generation is optional – card still works without it
        print(f"Image generation failed (non-fatal): {e}")

    result = {
        "name": name,
        "element": element,
        "description": description,
        "special_ability": special_ability,
        "weakness": weakness,
        **card_stats,
    }

    if card_image_b64:
        result["image_b64"] = card_image_b64

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
