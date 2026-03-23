from PIL import Image
import os

files = [
    'd:/CapibaraBlast/assets/mascot.png',
    'd:/CapibaraBlast/assets/capy_walk_sheet.png',
    'd:/CapibaraBlast/assets/capy_party_sheet.png',
    'd:/CapibaraBlast/assets/capy_panic_sheet.png'
]

def analyze(p):
    if not os.path.exists(p):
        print(f"{p} not found")
        return
    img = Image.open(p).convert('RGBA')
    w, h = img.size
    print(f"\nAnalyzing: {p} ({w}x{h})")
    
    # 8x8 ASCII logic to see the grid
    small = img.resize((32, 32)) 
    for y in range(32):
        row = ""
        for x in range(32):
            pix = small.getpixel((x,y))
            # non-white
            if sum(pix[:3]) < 720 and pix[3] > 50:
                row += "#"
            else:
                row += "."
        print(row)

for f in files:
    analyze(f)
