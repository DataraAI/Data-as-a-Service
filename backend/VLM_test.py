import torch
from transformers.image_utils import load_image
from transformers.video_utils import load_video
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

# ==========================================
# 1. Device Detection (Fix for Mac/MPS)
# ==========================================
if torch.cuda.is_available():
    device = "cuda"          # NVIDIA GPU
    with torch.no_grad():
        torch.cuda.empty_cache()
elif torch.backends.mps.is_available():
    device = "mps"           # Apple Silicon (M1/M2/M3)
    with torch.no_grad():
        torch.mps.empty_cache()
else:
    device = "cpu"           # CPU Fallback

print(f"✅ Device detected: {device.upper()}")

# ==========================================
# 2. Annotation Functions
# ==========================================
def generate_bmw_annotation(model, processor, filepath, detail):
    """
    Generate annotations for BMW egocentric vehicle images using a Vision-Language Model.
    """

    # Detect media type
    filepath_lower = filepath.lower()
    if filepath_lower.endswith((".jpg", ".jpeg", ".png")):
        media_type = "image"
        media = load_image(filepath)
    elif filepath_lower.endswith((".mp4", ".mov")):
        media_type = "video"
        media = load_video(filepath)
    else:
        raise ValueError(f"Unsupported media type for file: {filepath}")

    # Prompt templates for annotation types
    if detail == "viewpoint":
        prompt = (
            "Describe this BMW's egocentric view: note angle (frontal/low/high/oblique), grille distance, symmetry, and distortion."
        )

    elif detail == "grille_features":
        prompt = (
            "Analyze BMW kidney grille: list shape, bar count/spacing, finish, symmetry, and alignment (hood/lights/bumper). Note defects."
        )

    elif detail == "component_identification":
        prompt = (
            "List visible exterior parts (grille, lights, vents, sensors, hood, intakes). Briefly describe appearance."
        )

    elif detail == "alignment_quality":
        prompt = (
            "Assess fit quality: check alignment (hood/grille/bumper), panel gaps, and symmetry. List visible QC concerns."
        )

    elif detail == "factory_context":
        prompt = (
            "Describe factory environment: list visible tools, conveyors, lighting, and robotic machinery in the background."
        )

    elif detail == "damage_or_defects":
        prompt = (
            "Inspect for damage (scratches, dents, misalignment, missing parts, irregularities). List issues or state if none found."
        )

    else:
        raise ValueError(f"Unsupported detail type: {detail}")

    print(f"   ... Processing prompt for: {detail}")

    # Prepare messages for VLM
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": media_type,
                    media_type: media,
                },
                {
                    "type": "text",
                    "text": " Answer concisely. No full sentences: " + prompt,
                },
            ],
        }
    ]

    # Convert to model-friendly format
    text_prompt = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    image_inputs, video_inputs = process_vision_info(messages)

    # --- CRITICAL FIX: Use 'device' variable instead of hardcoded "cuda" ---
    inputs = processor(
        text=[text_prompt],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt"
    ).to(device) 

    # Generate model output
    generated_ids = model.generate(**inputs, max_new_tokens=200)

    # Remove input tokens from output
    trimmed_ids = [
        out[len(inp):]
        for inp, out in zip(inputs.input_ids, generated_ids)
    ]

    # Decode output
    output_text = processor.batch_decode(
        trimmed_ids,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False
    )

    # Split into lines for convenience
    final_output = []
    for o in output_text:
        final_output.extend(o.split("\n"))

    return final_output

def annotate_bmw_image_all(model, processor, filepath):
    """
    Runs all BMW annotation categories on a single image and returns
    a dictionary with the annotation results for each component.
    """

    detail_types = [
        # "viewpoint",
        "grille_features",
        "component_identification",
        "alignment_quality",
        "factory_context",
        "damage_or_defects"
    ]

    results = {}
    print(f"Starting analysis on: {filepath}")

    for detail in detail_types:
        try:
            output = generate_bmw_annotation(
                model=model,
                processor=processor,
                filepath=filepath,
                detail=detail
            )
            results[detail] = output
        except Exception as e:
            print(f"!!! Error processing {detail}: {e}")
            results[detail] = [f"Error: {e}"]

    return results

# ==========================================
# 3. Execution Block
# ==========================================
if __name__ == "__main__":
    # Load Model & Processor
    # Note: Qwen2.5 typically uses AutoProcessor. 
    # We load with the device map handled automatically or mapped to our detected device.
    
    print("Loading model... this may take a moment.")
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        "Qwen/Qwen2.5-VL-3B-Instruct", 
        dtype="auto", 
        device_map=device  # Explicitly map to 'mps' or 'cuda'
    )
    
    processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-3B-Instruct")
    print("Model loaded successfully.")

    # --- INPUT FILEPATH ---
    # Update this path to point to a real file on your specific machine
    # filepath = "/Users/aviksolanki/Desktop/datara_ai/backend/dataset_list/BMW_Front_Bumper/egos/BMW_Front_Bumper_1_ego_base.jpg"
    filepath = "/Users/aviksolanki/Desktop/datara_ai/backend/dataset_list/bmw_grill/orig/bmw_grill_272.jpg"

    # Run the full annotation suite
    try:
        all_annotations = annotate_bmw_image_all(
            model=model,
            processor=processor,
            filepath=filepath
        )

        print("\n=============== BMW Egocentric Image Annotations ===============\n")
        for key, value in all_annotations.items():
            print(f"\n--- {key.upper()} ---\n")
            for line in value:
                print(line)
                
    except Exception as e:
        print(f"\nCRITICAL FAILURE: Could not process file at {filepath}")
        print(f"Error details: {e}")