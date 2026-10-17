"""Read soundtrack labels from graph headers. Uncertain formats remain Unknown."""
import concurrent.futures
import io
import json
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageOps

root = Path('public')

def extract(row):
    result = {'format': 'Unknown'}
    if row.get('imagePath'):
        image = Image.open(root / row['imagePath']).convert('RGB')
        # Format labels are near the title. Never infer a format from a movie name.
        header = image.crop((0, 0, image.width, min(230, int(image.height * .24))))
        header = ImageOps.invert(header.convert('L'))
        buffer = io.BytesIO()
        header.save(buffer, format='PNG')
        text = subprocess.run(['tesseract', 'stdin', 'stdout', '--psm', '11'], input=buffer.getvalue(), capture_output=True, check=True).stdout.decode()
        text = re.sub(r'[^A-Z0-9:+]+', ' ', text.upper()).strip()
        patterns = [
            (r'DOLBY\s+ATMOS|TRUEHD\s+ATMOS', 'Dolby Atmos'),
            (r'DTS\s*:\s*X', 'DTS:X'),
            (r'DTS\s*HD\s+MASTER|DTS\s+HD\s+MA\b', 'DTS-HD Master Audio'),
            (r'DOLBY\s+TRUE\s*HD|TRUEHD', 'Dolby TrueHD'),
            (r'DTS\s*HD\s+HIGH', 'DTS-HD High Resolution'),
            (r'DOLBY\s+DIGITAL\s+PLUS', 'Dolby Digital Plus'),
            (r'DOLBY\s+DIGITAL', 'Dolby Digital'),
            (r'\bLPCM\b|\bPCM\b', 'PCM'),
            (r'\bDTS\b', 'DTS'),
        ]
        for pattern, label in patterns:
            if re.search(pattern, text):
                # Do not classify a partially read DTS-HD label as plain DTS.
                if label == 'DTS' and re.search(r'DTS\s*HD', text):
                    continue
                result = {'format': label, 'formatSource': 'graph-header-ocr'}
                break
    return str(row['id']), result

def main():
    rows = json.loads((root / 'graphs/catalogue.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        details = dict(pool.map(extract, rows))
    (root / 'graphs/metadata.json').write_text(json.dumps(details, indent=2) + '\n')
    from collections import Counter
    print('Extracted soundtrack formats:', dict(Counter(value['format'] for value in details.values())), flush=True)

if __name__ == '__main__':
    main()
