"""
Rebuild the 160x160 animation-frame strips for the 大肥鱼 sprite pet.

Sources (community project YunYueSama/codex-deepseek-pet, 大肥鱼项目署名许可 1.0):
- assets/ref/spritesheet-web.webp : compiled web sheet (idle / walk / wave / jump rows)
- assets/ref/motion-walk.png      : 32-frame walk cycle sheet (512px cells, 4 columns x 8 rows)

Every frame is cropped to a common box per action, scaled to 160px height and
centered on a transparent 160x160 canvas, so all actions share one square frame
and never stretch. Walk uses every 2nd frame of the 32-frame cycle (16 frames).

Run:  python tools/extract-sprites.py   (bundled Python with Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
REF = ASSETS / "ref"
FRAME = 160


def compose_frames(frames, crop, out_name):
    """Crop the same box from each frame, scale to height FRAME, center on canvas."""
    width, height = crop[2] - crop[0], crop[3] - crop[1]
    scale = FRAME / height
    frame_w = round(width * scale)
    strip = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for index, tile in enumerate(frames):
        piece = tile.crop(crop).resize((frame_w, FRAME), Image.LANCZOS)
        offset = (FRAME - frame_w) // 2
        strip.paste(piece, (index * FRAME + offset, 0), piece)
    out = ASSETS / out_name
    strip.save(out, "WEBP", quality=92, method=6)
    print(out_name, strip.size, out.stat().st_size)


def main():
    sheet = Image.open(REF / "spritesheet-web.webp").convert("RGBA")
    common_sheet_crop = (20, 12, 173, 187)
    for name, row, count in (("idle", 0, 6), ("wave", 3, 4), ("jump", 4, 5)):
        top = row * 208 + 16
        frames = [sheet.crop((col * 192, top, col * 192 + 192, top + 192)) for col in range(count)]
        compose_frames(frames, common_sheet_crop, "sprite-%s.webp" % name)

    walk_sheet = Image.open(REF / "motion-walk.png").convert("RGBA")
    cell = walk_sheet.size[0] // 4
    rows = walk_sheet.size[1] // cell
    tiles = []
    union = None
    for row in range(rows):
        for col in range(4):
            tile = walk_sheet.crop((col * cell, row * cell, (col + 1) * cell, (row + 1) * cell))
            bbox = tile.getchannel("A").getbbox()
            if bbox is None:
                continue
            tiles.append(tile)
            if union is None:
                union = list(bbox)
            else:
                union = [min(union[0], bbox[0]), min(union[1], bbox[1]), max(union[2], bbox[2]), max(union[3], bbox[3])]
    if len(tiles) != 32:
        raise SystemExit("expected 32 walk frames, got %d" % len(tiles))
    pad = 8
    walk_crop = (
        max(0, union[0] - pad),
        max(0, union[1] - pad),
        min(cell, union[2] + pad),
        min(cell, union[3] + pad),
    )
    # The 32-frame sheet stores four near-identical poses per gait group; the
    # project's own compiler samples one frame per group (column 0, rows 0..7).
    # Playing all 32 makes one pose linger and the next flash past, so use the
    # same curated 8-frame cycle the author ships for Codex.
    walk_frames = [tiles[row * 4] for row in range(8)]
    compose_frames(walk_frames, walk_crop, "sprite-walk.webp")


if __name__ == "__main__":
    main()
