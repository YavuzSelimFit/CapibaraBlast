import os
from PIL import Image

def color_to_alpha_fast(img):
    img = img.convert("RGBA")
    # Using list comprehension for speed
    data = img.getdata()
    new_data = [
        (255, 255, 255, 0) if (d[0] > 248 and d[1] > 248 and d[2] > 248) 
        else (d[0], d[1], d[2], 120) if (d[0] > 235 and d[1] > 235 and d[2] > 235) 
        else d 
        for d in data
    ]
    img.putdata(new_data)
    return img

def p(src_name, out_name, crop=None):
    src = os.path.join(brain_dir, src_name)
    out = os.path.join(assets_dir, out_name)
    if not os.path.exists(src): return
    img = Image.open(src)
    if crop: img = img.crop(crop)
    img = color_to_alpha_fast(img)
    bbox = img.getbbox()
    if bbox: img = img.crop(bbox)
    img.save(out, "PNG", optimize=False) # Disable optimize to avoid fileno errors
    print(f"Finalized: {out_name}")

brain_dir = r"C:\Users\Yavuz\.gemini\antigravity\brain\cf3f463b-639e-4e58-87c3-0e8ae06b9248"
assets_dir = r"d:\CapibaraBlast\assets"

# ONLY REMAINING LARGE ONES
p("game_title_gold_3d_1774282456771.png", "game_title.png")
p("capybara_avatar_gold_1774282036110.png", "mascot_gold.png")
p("capybara_main_menu_1774282077896.png", "capy_joy.png")
p("capybara_crying_1774282116745.png", "capy_crying.png")
p("menu_deco_blocks_final_v29_1774284364697.png", "deco_items.png")
