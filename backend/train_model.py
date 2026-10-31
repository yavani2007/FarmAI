import json
import random
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from PIL import Image
from sklearn.model_selection import train_test_split


# =========================
# Configuration
# =========================

PROJECT_ROOT = Path(r"D:\Documents\FarmAI")
DATASET_ROOT = PROJECT_ROOT / "PlantVillage-Dataset"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_model"

IMAGE_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 5
LEARNING_RATE = 0.0003
MAX_IMAGES_PER_CLASS = 300
RANDOM_SEED = 42

MODEL_DIR.mkdir(parents=True, exist_ok=True)

random.seed(RANDOM_SEED)
torch.manual_seed(RANDOM_SEED)


# =========================
# File paths
# =========================

BEST_MODEL_PATH = MODEL_DIR / "farmai_efficientnet_b0.pth"
LATEST_CHECKPOINT_PATH = MODEL_DIR / "latest_checkpoint.pth"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"


# =========================
# Selected crops
# =========================

SELECTED_CROPS = [
    "Apple",
    "Corn_(maize)",
    "Grape",
    "Potato",
    "Pepper,_bell",
    "Tomato",
]


# =========================
# Find dataset images
# =========================

image_extensions = {
    ".jpg",
    ".jpeg",
    ".png",
    ".JPG",
    ".JPEG",
    ".PNG",
}

samples = []
class_names = []

for class_dir in sorted(DATASET_ROOT.iterdir()):

    if not class_dir.is_dir():
        continue

    if class_dir.name.startswith("x_"):
        continue

    if not any(
        class_dir.name.startswith(crop + "___")
        for crop in SELECTED_CROPS
    ):
        continue

    image_files = [
        path
        for path in class_dir.iterdir()
        if path.is_file()
        and path.suffix in image_extensions
    ]

    if not image_files:
        continue

    random.shuffle(image_files)

    image_files = image_files[:MAX_IMAGES_PER_CLASS]

    class_names.append(class_dir.name)

    for image_path in image_files:
        samples.append(
            (
                str(image_path),
                class_dir.name,
            )
        )


class_names = sorted(class_names)

class_to_index = {
    name: index
    for index, name in enumerate(class_names)
}


print()
print("Selected classes:")

for index, name in enumerate(class_names):
    print(f"{index}: {name}")

print()
print(f"Images per class limit: {MAX_IMAGES_PER_CLASS}")
print(f"Total images: {len(samples)}")
print(f"Total classes: {len(class_names)}")


# =========================
# Train / validation / test
# =========================

paths = [
    item[0]
    for item in samples
]

labels = [
    class_to_index[item[1]]
    for item in samples
]


train_paths, temp_paths, train_labels, temp_labels = train_test_split(
    paths,
    labels,
    test_size=0.20,
    random_state=RANDOM_SEED,
    stratify=labels,
)


val_paths, test_paths, val_labels, test_labels = train_test_split(
    temp_paths,
    temp_labels,
    test_size=0.50,
    random_state=RANDOM_SEED,
    stratify=temp_labels,
)


print()
print(f"Training images: {len(train_paths)}")
print(f"Validation images: {len(val_paths)}")
print(f"Test images: {len(test_paths)}")


# =========================
# Dataset
# =========================

class FarmDataset(Dataset):

    def __init__(
        self,
        paths,
        labels,
        transform=None,
    ):
        self.paths = paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, index):

        image = Image.open(
            self.paths[index]
        ).convert("RGB")

        label = self.labels[index]

        if self.transform:
            image = self.transform(image)

        return image, label


# =========================
# Image transforms
# =========================

train_transform = transforms.Compose([
    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


evaluation_transform = transforms.Compose([
    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


# =========================
# Data loaders
# =========================

train_dataset = FarmDataset(
    train_paths,
    train_labels,
    train_transform,
)

val_dataset = FarmDataset(
    val_paths,
    val_labels,
    evaluation_transform,
)

test_dataset = FarmDataset(
    test_paths,
    test_labels,
    evaluation_transform,
)


train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0,
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
)


# =========================
# Device
# =========================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print()
print(f"Training device: {device}")


# =========================
# Load EfficientNet
# =========================

print()
print("Loading EfficientNet-B0...")

weights = EfficientNet_B0_Weights.DEFAULT

model = efficientnet_b0(
    weights=weights
)


number_of_classes = len(class_names)

model.classifier[1] = nn.Linear(
    model.classifier[1].in_features,
    number_of_classes,
)

model = model.to(device)


# =========================
# Loss and optimizer
# =========================

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=0.0001,
)


# =========================
# Training functions
# =========================

def train_one_epoch():

    model.train()

    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels_batch in train_loader:

        images = images.to(device)
        labels_batch = labels_batch.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels_batch,
        )

        loss.backward()

        optimizer.step()

        total_loss += (
            loss.item()
            * images.size(0)
        )

        predictions = outputs.argmax(
            dim=1
        )

        correct += (
            predictions == labels_batch
        ).sum().item()

        total += labels_batch.size(0)

    average_loss = total_loss / total
    accuracy = correct / total

    return average_loss, accuracy


def evaluate(loader):

    model.eval()

    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():

        for images, labels_batch in loader:

            images = images.to(device)
            labels_batch = labels_batch.to(device)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels_batch,
            )

            total_loss += (
                loss.item()
                * images.size(0)
            )

            predictions = outputs.argmax(
                dim=1
            )

            correct += (
                predictions == labels_batch
            ).sum().item()

            total += labels_batch.size(0)

    average_loss = total_loss / total
    accuracy = correct / total

    return average_loss, accuracy


# =========================
# Resume checkpoint
# =========================

start_epoch = 0
best_validation_accuracy = 0.0


if LATEST_CHECKPOINT_PATH.exists():

    print()
    print("Checkpoint found.")
    print("Loading checkpoint...")

    checkpoint = torch.load(
        LATEST_CHECKPOINT_PATH,
        map_location=device,
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    optimizer.load_state_dict(
        checkpoint["optimizer_state_dict"]
    )

    start_epoch = checkpoint["epoch"]

    best_validation_accuracy = checkpoint[
        "best_validation_accuracy"
    ]

    print(
        f"Resuming from epoch "
        f"{start_epoch + 1}/{EPOCHS}"
    )

else:

    print()
    print(
        "No previous checkpoint found."
    )

    print(
        "Starting from epoch 1."
    )


# =========================
# Training
# =========================

print()
print("Starting fast training...")
print()


for epoch in range(
    start_epoch,
    EPOCHS,
):

    current_epoch = epoch + 1

    print(
        f"Starting Epoch "
        f"{current_epoch}/{EPOCHS}..."
    )

    train_loss, train_accuracy = (
        train_one_epoch()
    )

    validation_loss, validation_accuracy = (
        evaluate(val_loader)
    )

    print(
        f"Epoch {current_epoch}/{EPOCHS} | "
        f"Train Loss: {train_loss:.4f} | "
        f"Train Accuracy: "
        f"{train_accuracy * 100:.2f}% | "
        f"Validation Loss: "
        f"{validation_loss:.4f} | "
        f"Validation Accuracy: "
        f"{validation_accuracy * 100:.2f}%"
    )


    # =========================
    # Save best model
    # =========================

    if (
        validation_accuracy
        > best_validation_accuracy
    ):

        best_validation_accuracy = (
            validation_accuracy
        )

        torch.save(
            {
                "model_state_dict":
                    model.state_dict(),

                "class_names":
                    class_names,

                "image_size":
                    IMAGE_SIZE,
            },
            BEST_MODEL_PATH,
        )

        print(
            "Best model saved."
        )


    # =========================
    # Save checkpoint
    # =========================

    torch.save(
        {
            "epoch":
                current_epoch,

            "model_state_dict":
                model.state_dict(),

            "optimizer_state_dict":
                optimizer.state_dict(),

            "best_validation_accuracy":
                best_validation_accuracy,

            "class_names":
                class_names,

            "image_size":
                IMAGE_SIZE,
        },
        LATEST_CHECKPOINT_PATH,
    )

    print(
        f"Checkpoint saved after "
        f"epoch {current_epoch}."
    )

    print()


# =========================
# Final test
# =========================

print()
print("Loading best model...")


if not BEST_MODEL_PATH.exists():

    print(
        "Best model was not created."
    )

    raise SystemExit(1)


checkpoint = torch.load(
    BEST_MODEL_PATH,
    map_location=device,
)

model.load_state_dict(
    checkpoint["model_state_dict"]
)


test_loss, test_accuracy = evaluate(
    test_loader
)


print()
print("Training completed.")

print(
    f"Best validation accuracy: "
    f"{best_validation_accuracy * 100:.2f}%"
)

print(
    f"Test accuracy: "
    f"{test_accuracy * 100:.2f}%"
)

print(
    f"Model saved to: "
    f"{BEST_MODEL_PATH}"
)


# =========================
# Save class names
# =========================

with open(
    CLASS_NAMES_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        class_names,
        file,
        indent=2,
    )


print(
    f"Class names saved to: "
    f"{CLASS_NAMES_PATH}"
)

print()
print("Training finished successfully.")