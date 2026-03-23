import os
from PIL import Image

def process_image(input_path, output_path, crop_box=None):
    if not os.path.exists(input_path):
        print(f"Skipping: {input_path} (not found)")
        return
    img = Image.open(input_path).convert("RGBA")
    
    if crop_box:
        img = img.crop(crop_box)
    
    # Surgical background removal (White thresholding)
    datas = img.getdata()
    newData = []
    # Using 245 as threshold for white or near-white
    for item in datas:
        if item[0] > 245 and item[1] > 245 and item[2] > 245:
            # Check edge pixels more carefully? (Alpha blending would be complex, just thresholding for now)
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved: {output_path}")

brain_dir = r"C:\Users\Yavuz\.gemini\antigravity\brain\cf3f463b-639e-4e58-87c3-0e8ae06b9248"
assets_dir = r"d:\CapibaraBlast\assets"

# 2.1 Grid
process_image(os.path.join(brain_dir, "game_grid_6x6_clean_v29_1774284327431.png"), os.path.join(assets_dir, "grid_bg.png"))

# 5.2 & 5.3 Tool Buttons (Split)
btns_img = os.path.join(brain_dir, "shuffle_hammer_btns_v29_1774284342425.png")
if os.path.exists(btns_img):
    process_image(btns_img, os.path.join(assets_dir, "btn_shuffle.png"), crop_box=(0, 0, 1024, 512))
    process_image(btns_img, os.path.join(assets_dir, "btn_hammer.png"), crop_box=(0, 512, 1024, 1024))

# 4.4 Deco Items
process_image(os.path.join(brain_dir, "menu_deco_blocks_final_v29_1774284364697.png"), os.path.join(assets_dir, "deco_items.png"))

# 6.1 Game Over Panel
process_image(os.path.join(brain_dir, "gameview_overlay_frosted_v29_1774284388144.png"), os.path.join(assets_dir, "gameover_panel.png"))

# 6.3 Revive Button
process_image(os.path.join(brain_dir, "revive_button_gold_v29_1774284401631.png"), os.path.join(assets_dir, "btn_revive.png"))
