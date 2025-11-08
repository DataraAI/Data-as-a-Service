# MongoDB Database Access & Training Scripts - Quick Reference

## 🔑 MongoDB Database Access

### Connection Information
- **Connection String:** `mongodb+srv://rithviggolf:{MONGODB_PASSWORD}@roboticdata.pqtfhwu.mongodb.net/`
- **Database:** `fiftyone`
- **Collection:** `samples`
- **Credentials:** Stored in `.env` file as `MONGODB_PASSWORD`

### Quick Access Example
```python
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
client = MongoClient(f"mongodb+srv://rithviggolf:{os.getenv('MONGODB_PASSWORD')}@roboticdata.pqtfhwu.mongodb.net/")
db = client["fiftyone"]
samples = db["samples"]

# Get all images
all_images = list(samples.find({}))
print(f"Total images: {len(all_images)}")

# Get image metadata
for image in all_images:
    print(f"Path: {image.get('filepath')}")
    print(f"Tags: {image.get('tags')}")
    print(f"Label: {image.get('ground_truth', {}).get('label')}")
```

**Note:** MongoDB stores metadata/filepaths. Actual images are in `backend/dataset/` and `backend/uploads/`.

---

## 🚂 Training Scripts Overview

### Classification Models

| Script | Purpose | Output | Dataset Location |
|--------|---------|--------|------------------|
| `train_resnet.py` | Basic binary classification (good/bad) | `resnet_checkpoint.pth` | `dataset/train/images/{good,bad}` |
| `new_train.py` | Enhanced ResNet with class balancing | `best_model.pth` | `dataset/train/images/{good,bad}` |

### Segmentation Models

| Script | Purpose | Output | Mask Format |
|--------|---------|--------|-------------|
| `train_segmentation.py` | DeepLabV3 segmentation | `deeplabv3_weld_segmentation.pth` | `_combined.png` |
| `train_deeplab.py` | Seam segmentation | `deeplab_seam.pth` | `_seam.png` |
| `train_segmental.py` | Binary segmentation (good/defect) | `segmentation_model.pth` | `_combined.png` |
| `train_seam_path.py` | Seam path detection | `seam_path_model.pth` | Custom structure |

### Testing

| Script | Purpose |
|--------|---------|
| `test_classifier.py` | Evaluate trained classification models |

---

## 📁 Expected Dataset Structure

```
backend/dataset/
  train/
    images/
      good/          # Good weld images (.jpg, .jpeg, .png)
      bad/           # Bad/defect weld images
    masks/
      good/          # Segmentation masks (.png)
      bad/
  val/
    images/
      good/
      bad/
    masks/
      good/
      bad/
```

---

## 🚀 Quick Start

### 1. Set up MongoDB access
```bash
cd backend
# Create .env file with:
# MONGODB_PASSWORD=your_password
```

### 2. Run MongoDB access example
```bash
python mongodb_access_example.py
```

### 3. Train a model
```bash
# For classification
python train_resnet.py

# For segmentation
python train_segmentation.py
```

---

## 📊 Key Files

- **MongoDB Connection:** `backend/deleteoldfiles.py` (example), `backend/app.py` (FiftyOne integration)
- **Training Scripts:** All `train_*.py` files in `backend/`
- **Dataset Loader:** `backend/dataset_segmentation.py`
- **Full Guide:** `MONGODB_AND_TRAINING_GUIDE.md`

---

## 💡 Important Notes

1. **MongoDB vs Filesystem:** MongoDB stores metadata; images are on the filesystem
2. **FiftyOne Integration:** Uses `MyDataset` to manage images with MongoDB backend
3. **Training:** All scripts read from local `dataset/` directory structure
4. **Model Outputs:** Trained models saved as `.pth` files in `backend/`

