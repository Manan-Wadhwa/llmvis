from flask import Flask, request, jsonify, send_from_directory
from transformers import GPT2Tokenizer, GPT2LMHeadModel
import torch
import numpy as np

app = Flask(__name__, 
            static_folder='templates/static', 
            static_url_path='/static')

# Load pre-trained GPT2 tokenizer and model
tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2", output_hidden_states=True, return_dict=True)

@app.route("/")
def home():
    return send_from_directory("templates", "index.html")

@app.route("/process", methods=["POST"])
def process():
    try:
        data = request.get_json()
        text = data.get("text")

        if not text:
            return jsonify({"success": False, "message": "No text provided!"})

        # Tokenize input
        inputs = tokenizer(text, return_tensors="pt")
        input_ids = inputs["input_ids"]

        # Perform forward pass through GPT-2 model
        with torch.no_grad():
            outputs = model(input_ids)

        hidden_states = outputs.hidden_states
        last_hidden_state = hidden_states[-1][0]

        # Collect layer progression data
        layer_progression = []
        layer_importances = []
        for i, hidden in enumerate(hidden_states[1:]):  # Skipping embedding layer
            avg_value = torch.mean(hidden[0]).item()
            std_value = torch.std(hidden[0]).item()
            importance = avg_value * std_value  # Combined metric for layer importance
            
            layer_progression.append({
                "layer": i + 1, 
                "avg_value": round(avg_value, 4),
                "std_value": round(std_value, 4),
                "importance": round(importance, 4)
            })
            layer_importances.append(importance)

        # Normalize layer importances for color scaling
        max_importance = max(layer_importances)
        normalized_importances = [imp / max_importance for imp in layer_importances]

        # Find most probable words in the last layer
        logits = model(input_ids).logits
        probabilities = torch.softmax(logits[0, -1, :], dim=0)
        top_k_indices = torch.topk(probabilities, k=5).indices
        top_k_words = tokenizer.decode(top_k_indices).split()
        top_k_probs = torch.topk(probabilities, k=5).values.tolist()

        return jsonify({
            "success": True, 
            "layer_progression": layer_progression,
            "normalized_importances": normalized_importances,
            "top_words": [
                {"word": word, "probability": round(float(prob), 4)} 
                for word, prob in zip(top_k_words, top_k_probs)
            ]
})

    except Exception as e:
        print(f"Error processing text: {e}")
        return jsonify({"success": False, "message": str(e)})

if __name__ == "__main__":
    app.run(debug=True)