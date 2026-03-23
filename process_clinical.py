import os
from PIL import Image, ImageChops, ImageDraw

def clean_white_bg(img):
    img = img.convert("RGBA")
    # Identify non-white pixels
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    diff = ImageChops.difference(img, bg)
    # Binary mask: everything not white is solid
    mask = diff.convert("L").point(lambda x: 255 if x > 1 else 0)
    img.putalpha(mask)
    
    # Trim
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img

def p(src_name, out_name):
    src = os.path.join(brain_dir, src_name)
    out = os.path.join(assets_dir, out_name)
    if not os.path.exists(src): 
        print(f"MISSING: {src_name}")
        return
    img = Image.open(src)
    img = clean_white_bg(img)
    img.save(out, "PNG")
    print(f"Clinically Cleaned: {out_name}")

brain_dir = r"C:\Users\Yavuz\.gemini\antigravity\brain\cf3f463b-639e-4e58-87c3-0e8ae06b9248"
assets_dir = r"d:\CapibaraBlast\assets"

# INDIVIDUAL ASSETS v32
p("btn_start_premium_v32_isolated_1774285667608.png", "btn_play.png")
p("btn_scores_premium_isolated_1774285188681.png", "btn_scores.png")

vals = {
    2: "block_2_premium_isolated_v32_1774285683596.png",
    4: "block_4_premium_isolated_v32_1774285698160.png",
    8: "block_8_premium_isolated_v32_1774285713116.png",
    16: "block_16_premium_isolated_v32_1774285738573.png",
    32: "block_32_premium_isolated_v32_1774285754441.png",
    64: "block_64_premium_isolated_v32_1774285769371.png",
    128: "block_128_premium_isolated_v32_1774285782522.png",
    256: "block_256_premium_isolated_v32_1774285798078.png"
}

for v, src in vals.items():
    p(src, f"block_{v}.png")
