import json
import os

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image


MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_model")
MODEL_PATH = os.path.join(MODEL_DIR, "farmai_efficientnet_b0.pth")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")


with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    class_names = json.load(f)


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


model = models.efficientnet_b0(weights=None)
model.classifier[1] = nn.Linear(
    model.classifier[1].in_features,
    len(class_names)
)

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=device)
)

model.to(device)
model.eval()


transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


image_path = input("Enter image path: ").strip().strip('"')


image = Image.open(image_path).convert("RGB")
image_tensor = transform(image).unsqueeze(0).to(device)


with torch.no_grad():
    output = model(image_tensor)
    probabilities = torch.softmax(output, dim=1)

confidence, predicted_index = torch.max(probabilities, dim=1)

predicted_class = class_names[predicted_index.item()]
confidence_percent = confidence.item() * 100


print()
print("===== FarmAI Custom Model Test =====")
print(f"Prediction: {predicted_class}")
print(f"Confidence: {confidence_percent:.2f}%")
print("====================================")