from PIL import Image
import os

files = {
    'capy_mood_happy_1774269953066.png': 'd:/CapibaraBlast/assets/capy_happy.png',
    'capy_mood_panic_1774269967601.png': 'd:/CapibaraBlast/assets/capy_panic.png',
    'capy_mood_party_1774269984154.png': 'd:/CapibaraBlast/assets/capy_party.png'
}
brain_dir = 'C:/Users/Yavuz/.gemini/antigravity/brain/cf3f463b-639e-4e58-87c3-0e8ae06b9248/'

def remove_white(in_path, out_path):
    img = Image.open(in_path).convert('RGBA')
    data = img.getdata()
    newData = []
    # Replace near-white pixels with transparent
    for item in data:
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    img.save(out_path, 'PNG')

for in_f, out_f in files.items():
    in_path = os.path.join(brain_dir, in_f)
    if os.path.exists(in_path):
        remove_white(in_path, out_f)
        print("Processed", in_f)
    else:
        print("Missing", in_f)
