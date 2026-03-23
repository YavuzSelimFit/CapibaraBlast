from PIL import Image
import os

files = [
    'd:/CapibaraBlast/assets/capy_walk_sheet.png',
    'd:/CapibaraBlast/assets/capy_party_sheet.png',
    'd:/CapibaraBlast/assets/capy_panic_sheet.png'
]

def analyze_bottom(p):
    if not os.path.exists(p): return
    img = Image.open(p).convert('RGBA')
    w, h = img.size
    print(f"\n--- {os.path.basename(p)} ({w}x{h}) ---")
    
    # Check bottom 20% for any non-transparent pixels
    bottom_start = int(h * 0.7)
    small = img.crop((0, bottom_start, w, h)).resize((32, 10))
    for y in range(10):
        row = ""
        for x in range(32):
            pix = small.getpixel((x,y))
            if pix[3] > 10: # not transparent
                row += "#"
            else:
                row += "."
        print(row)

for f in files:
    analyze_bottom(f)
