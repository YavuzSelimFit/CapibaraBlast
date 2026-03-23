from PIL import Image
import os

files = [
    'd:/CapibaraBlast/assets/capy_walk_sheet.png',
    'd:/CapibaraBlast/assets/capy_party_sheet.png',
    'd:/CapibaraBlast/assets/capy_panic_sheet.png'
]

def clean_and_crop(p):
    if not os.path.exists(p): return
    img = Image.open(p).convert('RGBA')
    w, h = img.size
    
    # 1. Force white/near-white background to pure transparent
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # If high brightness and not already transparent
            if r > 245 and g > 245 and b > 245:
                pixels[x, y] = (0, 0, 0, 0)
    
    # 2. Find bounding box of actual capybaras
    bbox = img.getbbox() # (left, upper, right, lower)
    if not bbox: return
    
    # We know these are grids. Let's find the 'useful' content area.
    # The user said there is text at the bottom.
    # Let's crop it to the TOP HALF where the capybaras live.
    
    # Standard grid for 4x2 or 2x2:
    # We'll take the top 70% to be safe from text.
    crop_h = int(h * 0.7)
    
    # Actually, let's just use the bbox but truncate the bottom noise.
    # If the bbox lower is > 70% of h, it's probably text.
    safe_lower = min(bbox[3], int(h * 0.68))
    
    final_box = (bbox[0], bbox[1], bbox[2], safe_lower)
    clean_img = img.crop(final_box)
    
    # Save over the original
    clean_img.save(p)
    print(f"Cleaned {p}: {w}x{h} -> {clean_img.size[0]}x{clean_img.size[1]}")

for f in files:
    clean_and_crop(f)
