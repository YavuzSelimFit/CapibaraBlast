import os
from PIL import Image

def process_image(input_path, output_path, crop_box=None):
    if not os.path.exists(input_path):
        print(f"Skipping: {input_path} (not found)")
        return
    img = Image.open(input_path).convert("RGBA")
    
    # Crop if box provided (left, top, right, bottom)
    if crop_box:
        img = img.crop(crop_box)
    
    # White to transparent (simple threshold)
    datas = img.getdata()
    newData = []
    for item in datas:
        # If r, g, b are all > 240, make it transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    
    # Trim empty space
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved: {output_path}")

# Base Dir
brain_dir = r"C:\Users\Yavuz\.gemini\antigravity\brain\cf3f463b-639e-4e58-87c3-0e8ae06b9248"
assets_dir = r"d:\CapibaraBlast\assets"
if not os.path.exists(assets_dir): os.makedirs(assets_dir)

# 1. Characters
process_image(os.path.join(brain_dir, "capybara_avatar_gold_1774282036110.png"), os.path.join(assets_dir, "mascot_gold.png"))
process_image(os.path.join(brain_dir, "capybara_main_menu_1774282077896.png"), os.path.join(assets_dir, "capy_joy.png"))
process_image(os.path.join(brain_dir, "capybara_crying_1774282116745.png"), os.path.join(assets_dir, "capy_crying.png"))

# 2. Numbered Blocks (Asset 2.2 retry)
# 1024x1024 image, 2 rows of 4
# Approximate boxes for 256x256 chunks
block_img = os.path.join(brain_dir, "numbered_blocks_full_set_retry_1774282493572.png")
vals = [2, 4, 8, 16, 32, 64, 128, 256]
if os.path.exists(block_img):
    full_img = Image.open(block_img)
    w, h = full_img.size # 1024x1024
    for i, val in enumerate(vals):
        row = i // 4
        col = i % 4
        box = (col * (w//4), row * (h//2), (col+1) * (w//4), (row+1) * (h//2))
        process_image(block_img, os.path.join(assets_dir, f"block_{val}.png"), crop_box=box)

# 3. Header Frames (3.1/3.2)
# Two wide strips
frames_img = os.path.join(brain_dir, "score_level_frames_frosted_1774282429334.png")
if os.path.exists(frames_img):
    process_image(frames_img, os.path.join(assets_dir, "score_frame.png"), crop_box=(0, 0, 1024, 512))
    process_image(frames_img, os.path.join(assets_dir, "level_frame.png"), crop_box=(0, 512, 1024, 1024))

# 4. Buttons (4.2/4.3)
btn_img = os.path.join(brain_dir, "menu_buttons_pill_translucent_1774282470647.png")
if os.path.exists(btn_img):
    process_image(btn_img, os.path.join(assets_dir, "btn_play.png"), crop_box=(0, 0, 1024, 512))
    process_image(btn_img, os.path.join(assets_dir, "btn_scores.png"), crop_box=(0, 512, 1024, 1024))

# 4.1 Title
process_image(os.path.join(brain_dir, "game_title_gold_3d_1774282456771.png"), os.path.join(assets_dir, "game_title.png"))

# 4.5 Background (No background removal needed, just rename)
src_bg = os.path.join(brain_dir, "premium_water_cattail_bg_v29_1774282578458.png")
if os.path.exists(src_bg):
    Image.open(src_bg).save(os.path.join(assets_dir, "bg.png"))

# 5.1 Bomb
process_image(os.path.join(brain_dir, "bomb_tool_btn_v29_1774282591230.png"), os.path.join(assets_dir, "btn_bomb.png"))

# 6.2 Water Drop
process_image(os.path.join(brain_dir, "water_drop_icon_v29_1774282538650.png"), os.path.join(assets_dir, "water_drop.png"))

# 6.4 Restart
process_image(os.path.join(brain_dir, "try_again_button_pill_1774282557518.png"), os.path.join(assets_dir, "btn_restart.png"))
