import os
from PIL import Image

def color_to_alpha_surgical(img):
    img = img.convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # High-precision glass transparency
        r, g, b, a = item
        if r > 252 and g > 252 and b > 252:
            newData.append((255, 255, 255, 0))
        elif r > 240 and g > 240 and b > 240:
            # Subtle gradient for frosted edges
            newData.append((r, g, b, 50))
        elif r > 220 and g > 220 and b > 220:
            newData.append((r, g, b, 150))
        else:
            newData.append(item)
    img.putdata(newData)
    return img

def p(src_name, out_name, crop=None):
    src = os.path.join(brain_dir, src_name)
    out = os.path.join(assets_dir, out_name)
    if not os.path.exists(src): 
        print(f"MISSING: {src_name}")
        return
    img = Image.open(src)
    if crop: img = img.crop(crop)
    img = color_to_alpha_surgical(img)
    bbox = img.getbbox()
    if bbox: img = img.crop(bbox)
    img.save(out, "PNG")
    print(f"Emergency Processed: {out_name}")

brain_dir = r"C:\Users\Yavuz\.gemini\antigravity\brain\cf3f463b-639e-4e58-87c3-0e8ae06b9248"
assets_dir = r"d:\CapibaraBlast\assets"

# INDIVIDUAL BUTTONS (No more cropping errors)
p("btn_start_premium_isolated_1774285175557.png", "btn_play.png")
p("btn_scores_premium_isolated_1774285188681.png", "btn_scores.png")

# LOGIC-MATCHED GRID
p("game_grid_8x10_premium_v29_1774284865226.png", "grid_bg.png")

# RERUN BLOCKS (Ensuring high quality)
blocks_src = "numbered_blocks_full_set_retry_1774282493572.png"
vals = [2, 4, 8, 16, 32, 64, 128, 256]
for i, v in enumerate(vals):
    row, col = i//4, i%4
    p(blocks_src, f"block_{v}.png", (col*256, row*512, (col+1)*256, (row+1)*512))

# PANEL & OTHERS
p("gameview_overlay_frosted_v29_1774284388144.png", "gameover_panel.png")
p("revive_button_gold_v29_1774284401631.png", "btn_revive.png")
p("try_again_button_pill_1774282557518.png", "btn_restart.png")
p("game_title_gold_3d_1774282456771.png", "game_title.png")
p("capybara_avatar_gold_1774282036110.png", "mascot_gold.png")
p("capybara_main_menu_1774282077896.png", "capy_joy.png")
p("capybara_crying_1774282116745.png", "capy_crying.png")
p("menu_deco_blocks_final_v29_1774284364697.png", "deco_items.png")
p("score_level_frames_frosted_1774282429334.png", "score_frame.png", (0, 0, 1024, 512))
p("score_level_frames_frosted_1774282429334.png", "level_frame.png", (0, 512, 1024, 1024))
p("bomb_tool_btn_v29_1774282591230.png", "btn_bomb.png")
p("shuffle_hammer_btns_v29_1774284342425.png", "btn_shuffle.png", (0, 0, 1024, 512))
p("shuffle_hammer_btns_v29_1774284342425.png", "btn_hammer.png", (0, 512, 1024, 1024))
p("water_drop_icon_v29_1774282538650.png", "water_drop.png")
