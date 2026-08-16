from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"


def save_webp(source: Path, target: Path, *, quality: int = 80, size=None) -> None:
    with Image.open(source) as image:
        image = image.convert("RGBA" if image.mode in {"RGBA", "LA"} else "RGB")
        if size:
            image.thumbnail(size, Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=quality, method=6)


for index in range(1, 8):
    save_webp(IMAGES / f"banner-{index}.png", IMAGES / f"banner-{index}.webp", quality=80)

save_webp(IMAGES / "logo.png", IMAGES / "logo-display.webp", quality=84, size=(96, 96))
save_webp(IMAGES / "lowcode-2458186.jfif", IMAGES / "firefox-96.webp", quality=82, size=(96, 96))

with Image.open(IMAGES / "og-deepseek-exporter.png") as image:
    image = image.convert("RGB")
    image.save(
        IMAGES / "og-deepseek-exporter.jpg",
        "JPEG",
        quality=85,
        optimize=True,
        progressive=True,
        subsampling="4:2:0",
    )

source_files = [*(IMAGES / f"banner-{i}.png" for i in range(1, 8)), IMAGES / "logo.png", IMAGES / "lowcode-2458186.jfif", IMAGES / "og-deepseek-exporter.png"]
optimized_files = [*(IMAGES / f"banner-{i}.webp" for i in range(1, 8)), IMAGES / "logo-display.webp", IMAGES / "firefox-96.webp", IMAGES / "og-deepseek-exporter.jpg"]
source_bytes = sum(path.stat().st_size for path in source_files)
optimized_bytes = sum(path.stat().st_size for path in optimized_files)
print(f"source_bytes={source_bytes}")
print(f"optimized_bytes={optimized_bytes}")
print(f"saved_percent={(1 - optimized_bytes / source_bytes) * 100:.1f}")
for source, optimized in zip(source_files, optimized_files):
    print(f"{source.name}: {source.stat().st_size} -> {optimized.name}: {optimized.stat().st_size}")
