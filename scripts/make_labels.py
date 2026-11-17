"""Create printable QR labels for fictional training assets.

No network calls at runtime. The encoded URL contains only a public demo asset ID.
Usage: python scripts/make_labels.py dist/qr
Dependency: qrcode (build-time only).
"""
from pathlib import Path
import sys
import qrcode
import qrcode.image.svg

ASSETS = ("DEMO-MON-01", "DEMO-PUMP-02", "DEMO-VENT-03")
BASE = "https://mikelninh.github.io/MEDTECH-COPILOT/"


def main() -> None:
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("qr")
    dest.mkdir(parents=True, exist_ok=True)
    for asset_id in ASSETS:
        target = BASE + "?view=field&device=" + asset_id
        code = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=3,
        )
        code.add_data(target)
        code.make(fit=True)
        img = code.make_image(image_factory=qrcode.image.svg.SvgPathImage)
        img.save(dest / f"{asset_id}.svg")
        print(f"OK {asset_id}: {target}")


if __name__ == "__main__":
    main()
