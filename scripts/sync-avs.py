"""Sync only the first-post AVS List of Films and cache its Imgur graphs."""
import concurrent.futures
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

from avs_source import THREAD_URL, read_films, image_key

from PIL import Image

ROOT = Path('public/graphs')
CATALOGUE = ROOT / 'catalogue.json'
METADATA = ROOT / 'metadata.json'

def normalized(url):
    return url.strip().replace('http://i.imgur.com/', 'https://i.imgur.com/')

def recover(row):
    row = dict(row)
    if row.get('sourceImagePath'):
        cached_url = normalized(row.get('cachedSourceURL', ''))
        cached_path = 'graphs/' + hashlib.sha256(cached_url.encode()).hexdigest()[:20] + '.jpg'
        if cached_url and (Path('public') / cached_path).is_file():
            row['sourceImagePath'] = cached_path
        row['imagePath'] = row['sourceImagePath']
    source = normalized(row.get('imgurURL', ''))
    cached = normalized(row.get('cachedSourceURL', row.get('_oldSource', '')))
    image_path = row.get('imagePath')
    if image_path and (Path('public') / image_path).is_file() and source == cached:
        return row, False
    parts = urllib.parse.urlsplit(source)
    if parts.scheme != 'https' or parts.hostname != 'i.imgur.com' or not re.fullmatch(r'/[A-Za-z0-9]+\.(?:png|jpg|jpeg|webp)', parts.path, re.I):
        print(f"Unavailable direct image: {row['movieName']}", flush=True)
        return row, False
    try:
        request = urllib.request.Request(source, headers={'User-Agent': 'MoviesBassGraphs/1.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read(15 * 1024 * 1024 + 1)
        if len(data) > 15 * 1024 * 1024:
            raise ValueError('Image exceeds 15 MB')
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            if image.width < 500 or image.height < 200:
                raise ValueError('Source returned a small placeholder')
            # Imgur sometimes returns restriction images with HTTP 200.
            import subprocess
            check = subprocess.run(['tesseract', 'stdin', 'stdout', '--psm', '11'], input=data,
                                   capture_output=True, check=True, timeout=30).stdout.decode().lower()
            if any(text in check for text in ['not viewable', 'not available in your', 'image has been removed', 'image you are requesting does not exist']):
                raise ValueError('Source returned an unavailable-image placeholder')
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=95)
        name = hashlib.sha256(source.encode()).hexdigest()[:20] + '.jpg'
        destination = ROOT / name
        new_data = output.getvalue()
        if not destination.exists() or destination.read_bytes() != new_data:
            temporary = destination.with_suffix('.tmp')
            temporary.write_bytes(new_data)
            temporary.replace(destination)
        row['imagePath'] = 'graphs/' + name
        if row.get('sourceImagePath'):
            row['sourceImagePath'] = row['imagePath']
        row['cachedSourceURL'] = source
        print(f"Cached: {row['movieName']}", flush=True)
        return row, True
    except Exception as error:
        print(f"Kept saved copy for {row['movieName']}: {error}", flush=True)
        return row, False

def split_graphs(rows, metadata):
    # Keep the original cached source so source syncs never crop a crop.
    result = []
    for row in rows:
        if row.get('splitFrom'):
            continue
        if row['movieName'] != 'Edge of Tomorrow (2014)' or not row.get('imagePath'):
            result.append(row)
            continue
        source_path = row.get('sourceImagePath', row['imagePath'])
        with Image.open(Path('public') / source_path) as image:
            layouts = {(1790, 1861): (865, 1858), (1922, 1987): (994, 1986)}
            if image.size not in layouts:
                raise ValueError('Edge of Tomorrow source layout changed; split needs review')
            divider, bottom = layouts[image.size]
            width = image.width
            for identifier, title, box, suffix in [
                ('149', 'Edge of Tomorrow (2014)', (0, 0, width, divider), 'top'),
                ('149-without-sine-wave-intro', 'Edge of Tomorrow (2014) | without sine wave intro',
                 (0, divider, width, bottom), 'without-intro'),
            ]:
                destination = ROOT / (Path(source_path).stem + '-' + suffix + '.png')
                output = io.BytesIO()
                image.crop(box).save(output, format='PNG')
                if not destination.exists() or destination.read_bytes() != output.getvalue():
                    destination.write_bytes(output.getvalue())
                item = {**row, 'id': identifier, 'movieName': title,
                        'sourceImagePath': source_path, 'imagePath': 'graphs/' + destination.name}
                if identifier != '149':
                    item['splitFrom'] = '149'
                    metadata[identifier] = dict(metadata.get('149', {'format': 'Unknown'}))
                result.append(item)
    return result

def main():
    previous = json.loads(CATALOGUE.read_text())
    remote = read_films()
    metadata = json.loads(METADATA.read_text()) if METADATA.exists() else {}
    base_rows = [row for row in previous if not row.get('splitFrom')]
    by_source, by_title = {}, {}
    for row in base_rows:
        by_source.setdefault(image_key(row.get('imgurURL', '')), []).append(row)
        by_title.setdefault(row['movieName'].casefold(), []).append(row)
    occupied = {str(row['id']) for row in previous}
    used = set()
    pending = []
    for incoming in remote:
        source = normalized(incoming['imgurURL'])
        source_matches = [row for row in by_source.get(image_key(source), []) if str(row['id']) not in used]
        title_matches = [row for row in by_title.get(incoming['movieName'].casefold(), []) if str(row['id']) not in used]
        exact_matches = [row for row in source_matches if row['movieName'].casefold() == incoming['movieName'].casefold()]
        candidates = exact_matches or source_matches or title_matches
        old = candidates[0] if candidates else None
        if old:
            item = dict(old)
            item['_oldSource'] = old.get('imgurURL', '')
        else:
            base_identifier = 'avs-' + hashlib.sha256((incoming['movieName'].casefold() + '|' + image_key(source)).encode()).hexdigest()[:16]
            identifier = base_identifier
            occurrence = 1
            while identifier in occupied:
                occurrence += 1
                identifier = f'{base_identifier}-{occurrence}'
            occupied.add(identifier)
            item = {'id': identifier, 'imagePath': None, '_oldSource': ''}
        used.add(str(item['id']))
        if source != normalized(item.get('cachedSourceURL', item.get('_oldSource', ''))) and item.get('imagePath'):
            item.setdefault('cachedSourceURL', normalized(item.get('_oldSource', '')))
        item['movieName'] = incoming['movieName']
        item['imgurURL'] = incoming['imgurURL']
        item['source'] = 'avs-first-post'
        pending.append(item)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(recover, pending))
    # Only indexed films are shown; saved files remain available for old links.
    rows = [row for row, _ in results]
    changed_images = [row for row, downloaded in results if downloaded]
    if changed_images:
        spec = importlib.util.spec_from_file_location('graph_metadata', 'scripts/extract-metadata.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for row in changed_images:
            try:
                identifier, detail = module.extract(row)
                metadata[identifier] = detail
            except Exception as error:
                metadata[str(row['id'])] = {'format': 'Unknown'}
                print(f"Format unknown for {row['movieName']}: {error}")
    rows = split_graphs(rows, metadata)
    for row in rows:
        row.pop('_oldSource', None)
    (ROOT / 'avs-index.json').write_text(json.dumps({
        'sourceURL': THREAD_URL, 'section': 'List of Films,', 'filmCount': len(remote),
        'films': remote,
    }, indent=2) + '\n')
    CATALOGUE.write_text(json.dumps(rows, indent=2) + '\n')
    METADATA.write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'Synced {len(remote)} AVS first-post films; downloaded {len(changed_images)} graphs; published {len(rows)} cards.')

if __name__ == '__main__':
    main()
