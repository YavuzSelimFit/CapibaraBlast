import os
import sys
from PIL import Image, ImageChops

def clean_and_crop(input_path, output_path, target_size=(128, 128), threshold=250, feather=2):
    """
    Advanced background removal, auto-cropping, and resizing.
    - threshold: colors with R,G,B > threshold are made transparent.
    - feather: radius for alpha smoothing to prevent 'halos'.
    """
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return False

    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    # Step 1: Remove background with threshold
    new_data = []
    for item in datas:
        # Check if the pixel is near-white (threshold)
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    
    # Step 2: Auto-crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    # Step 3: Resize with aspect ratio preservation
    # We fit the cropped image into target_size
    img.thumbnail(target_size, Image.Resampling.LANCZOS)
    
    # Step 4: Save optimized
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG", optimize=True)
    print(f"Success: {output_path} | Size: {img.size}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_v2.py <input> <output> [size_px]")
    else:
        size = int(sys.argv[3]) if len(sys.argv) > 3 else 128
        clean_and_crop(sys.argv[1], sys.argv[2], (size, size))
