from PIL import Image, ImageChops
import os

def g(p):
    try:
        i = Image.open(p).convert('RGBA')
        b = Image.new('RGBA', i.size, (255,255,255,255))
        diff = ImageChops.difference(i, b)
        print(p)
        print('Size:', i.size)
        print('Non-white bounds:', diff.getbbox())
        
        small = i.resize((32, 32))
        for y in range(32):
            row = ""
            for x in range(32):
                p = small.getpixel((x,y))
                # treat relatively dark / non-white pixels as body
                if sum(p[:3]) < 720 and p[3] > 100:
                    row += "#"
                else:
                    row += " "
            print(row)
    except Exception as e:
        print("Error:", e)

g('d:/CapibaraBlast/assets/mascot.png')
g('d:/CapibaraBlast/assets/capy_panic_sheet.png')
