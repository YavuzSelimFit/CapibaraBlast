import os
from process_v2 import clean_and_crop

# Config
BRAIN_DIR = r"C:\Users\Yavuz\.gemini\antigravity\brain\f9cdd789-d31f-41ad-9b56-b6e940c5d1fa"
ASSETS_DIR = r"d:\CapibaraBlast\assets"

files = {
    "block_2_raw_1774373688956.png": "block_2.png",
    "block_4_raw_1774373705182.png": "block_4.png",
    "block_8_raw_1774373719594.png": "block_8.png",
    "block_16_raw_1774373737082.png": "block_16.png",
    "block_32_raw_1774373751565.png": "block_32.png",
    "block_64_raw_1774373767623.png": "block_64.png",
    "block_128_raw_1774373779210.png": "block_128.png",
    "block_256_raw_1774373795783.png": "block_256.png",
    "btn_play_raw_1774373814779.png": "btn_play.png",
    "btn_revive_raw_1774373828140.png": "btn_revive.png",
    "btn_restart_raw_1774373842403.png": "btn_restart.png",
    "btn_scores_raw_1774373872157.png": "btn_scores.png",
    "mascot_fresh_raw_1774373857624.png": "capy_happy.png",
    "mascot_panic_raw_1774375639693.png": "capy_panic.png",
    "mascot_party_raw_1774375655403.png": "capy_party.png",
    "game_title_fresh_raw_1774375671162.png": "game_title.png"
}

for src_name, out_name in files.items():
    src = os.path.join(BRAIN_DIR, src_name)
    out = os.path.join(ASSETS_DIR, out_name)
    
    # Blocks -> 128x128, Buttons/Mascot -> 256x256 OR larger if needed
    size = 128 if "block" in out_name else 256
    
    print(f"Processing {src_name} -> {out_name} (Size: {size})")
    clean_and_crop(src, out, (size, size))

print("Batch processing complete.")
