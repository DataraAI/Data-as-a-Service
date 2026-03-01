# MongoDB Database Access and Training/Testing Guide

## 📊 MongoDB Database Access

### Connection Details

The MongoDB database is accessed using the following connection string:

```text
mongodb+srv://rithviggolf:{MONGODB_PASSWORD}@roboticdata.pqtfhwu.mongodb.net/
```

**Database Name:** `fiftyone`
**Collection Name:** `samples`

### How to Access MongoDB

#### 1. **Environment Setup**

Create a `.env` file in the `backend/` directory with:

```env
MONGODB_PASSWORD=your_mongodb_password_here
```

#### 2. **Python Access Example**

```python
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load MongoDB credentials from .env
load_dotenv()
db_password = os.getenv("MONGODB_PASSWORD")

# Connect to MongoDB cluster
client = MongoClient(f"mongodb+srv://rithviggolf:{db_password}@roboticdata.pqtfhwu.mongodb.net/")

# Access the FiftyOne database
db = client.get_database("fiftyone")

# Access the samples collection (where images/metadata are stored)
samples_collection = db["samples"]

# Query all images
all_images = list(samples_collection.find({}))
print(f"Total images in database: {len(all_images)}")

# Query specific image
sample_image = samples_collection.find_one({"filepath": "path/to/image.jpg"})

# Get image metadata
for image in samples_collection.find({}):
    print(f"Filepath: {image.get('filepath')}")
    print(f"Tags: {image.get('tags', [])}")
    print(f"Ground Truth: {image.get('ground_truth', {})}")
```

#### 3. **FiftyOne Integration**

FiftyOne is used as the dataset management layer, which stores metadata in MongoDB:

- **FiftyOne Dataset:** `MyDataset`
- **Database:** `fiftyone` (MongoDB)
- **Collection:** `samples`

When you create a FiftyOne dataset in `app.py` or `app_production.py`, it automatically stores:

- Image file paths
- Ground truth labels/classifications
- Tags (weld_shapes, noise_types, colors)
- Sample metadata

#### 4. **Accessing Images via MongoDB**

Images are stored with their file paths and metadata. To retrieve images:

```python
# Get all samples
db = client.get_database("fiftyone")
samples = db["samples"].find({})

for sample in samples:
    filepath = sample.get("filepath")
    # Use filepath to load the actual image file
    # Images are stored on the local filesystem, not in MongoDB
```

**Note:** MongoDB stores metadata and file paths. The actual image files are stored in:

- `backend/dataset/` (training/validation images)
- `backend/uploads/` (uploaded images)

---

## 🚂 Training Scripts Usage

The backend directory contains multiple training scripts for different machine learning models:

### 1. **Binary Classification (ResNet18)**

#### `train_resnet.py` - Simple ResNet classifier

- **Purpose:** Binary classification (good vs bad welds)
- **Dataset Structure:**

  ```text
  dataset/
    train/
      images/
        good/
        bad/
    val/
      images/
        good/
        bad/
  ```

- **Usage:**

  ```bash
  cd backend
  python train_resnet.py
  ```

- **Output:** `resnet_checkpoint.pth`
- **Model:** ResNet18 with 2-class output

#### `new_train.py` - Enhanced ResNet with weighted sampling

- **Purpose:** Better handling of class imbalance
- **Features:**
  - Weighted random sampling
  - Data augmentation
  - Per-class metrics
  - Best model saving
- **Usage:**

  ```bash
  cd backend
  python new_train.py
  ```

- **Output:** `best_model.pth`

### 2. **Segmentation Models**

#### `train_segmentation.py` - DeepLabV3 Segmentation

- **Purpose:** Semantic segmentation using DeepLabV3
- **Dataset Structure:**

  ```text
  dataset/
    train/
      images/
        good/
        bad/
      masks/
        good/
        bad/
    val/
      images/
        good/
        bad/
      masks/
        good/
        bad/
  ```

- **Mask Format:** `_combined.png` suffix
- **Usage:**

  ```bash
  cd backend
  python train_segmentation.py
  ```

- **Output:** `deeplabv3_weld_segmentation.pth`
- **Uses:** `dataset_segmentation.py` for dataset loading

#### `train_deeplab.py` - DeepLabV3 for seam segmentation

- **Purpose:** Seam-specific segmentation
- **Mask Format:** `_seam` suffix in mask filenames
- **Usage:**

  ```bash
  cd backend
  python train_deeplab.py
  ```

- **Output:** `deeplab_seam.pth`

#### `train_segmental.py` - Binary segmentation (good vs defect)
- **Purpose:** 2-class segmentation (good vs defect regions)
- **Usage:**
  ```bash
  cd backend
  python train_segmental.py
  ```
- **Output:** `segmentation_model.pth`

#### `train_seam_path.py` - Seam path detection
- **Purpose:** Detect seam paths in unwelded images
- **Dataset Structure:**
  ```
  unwelded_images/
    train/
      images/
      masks_clean/
    val/
      images/
      masks_clean/
  ```
- **Usage:**
  ```bash
  cd backend
  python train_seam_path.py
  ```
- **Output:** `seam_path_model.pth`
- **Features:**
  - Dice coefficient metric
  - Weighted loss for imbalanced classes
  - Data augmentation (flips, rotations)

### 3. **Testing Script**

#### `test_classifier.py` - Model evaluation
- **Purpose:** Test trained classification models
- **Usage:**
  ```bash
  cd backend
  python test_classifier.py
  ```
- **Expected:** Loads a trained model and evaluates on validation set

---

## 📁 Dataset Structure

All training scripts expect the following structure:

```
backend/
  dataset/
    train/
      images/
        good/          # Good weld images
        bad/           # Bad/defect weld images
      masks/
        good/          # Segmentation masks for good welds
        bad/           # Segmentation masks for bad welds
    val/
      images/
        good/
        bad/
      masks/
        good/
        bad/
```

**Mask Naming Conventions:**
- `_seam.png` - Seam masks
- `_weld.png` - Weld masks
- `_combined.png` - Combined masks

---

## 🔧 Common Training Workflow

1. **Prepare Dataset:**
   - Organize images in `dataset/train/images/{good,bad}` and `dataset/val/images/{good,bad}`
   - Add corresponding masks in `dataset/train/masks/{good,bad}` (for segmentation)

2. **Set Environment:**
   ```bash
   cd backend
   # Ensure .env file exists with MONGODB_PASSWORD
   ```

3. **Choose Training Script:**
   - Classification: `train_resnet.py` or `new_train.py`
   - Segmentation: `train_segmentation.py`, `train_deeplab.py`, or `train_segmental.py`
   - Seam Path: `train_seam_path.py`

4. **Run Training:**
   ```bash
   python <training_script>.py
   ```

5. **Check Output:**
   - Trained models saved as `.pth` files
   - Training metrics printed to console
   - Best models automatically saved during training

---

## 🔑 Key Points

1. **MongoDB stores metadata, not images:** File paths and annotations are in MongoDB; actual images are on the filesystem.

2. **FiftyOne provides dataset management:** The `MyDataset` FiftyOne dataset acts as an interface to MongoDB for image metadata.

3. **Training scripts use local filesystem:** All training scripts read directly from the `dataset/` directory structure, not from MongoDB.

4. **Multiple model types:** The codebase supports both classification (good/bad) and segmentation (mask prediction) tasks.

5. **Flexible mask formats:** Different scripts look for different mask naming conventions (`_seam`, `_combined`, etc.).

---

## 📝 Example: Complete Workflow

```python
# 1. Access MongoDB
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(f"mongodb+srv://rithviggolf:{os.getenv('MONGODB_PASSWORD')}@roboticdata.pqtfhwu.mongodb.net/")
db = client["fiftyone"]
samples = db["samples"]

# 2. List all images in database
all_samples = list(samples.find({}))
print(f"Found {len(all_samples)} images in database")

# 3. Get image paths
image_paths = [s.get("filepath") for s in all_samples]

# 4. Train a model (using local dataset)
# Run: python train_resnet.py
```

---

## 🛠️ Troubleshooting

- **MongoDB Connection Issues:** Check `.env` file has correct `MONGODB_PASSWORD`
- **Dataset Not Found:** Ensure `dataset/` directory exists with proper structure
- **Mask Mismatch:** Verify mask filenames match expected suffixes for each training script
- **CUDA Errors:** Scripts automatically fall back to CPU if GPU unavailable
