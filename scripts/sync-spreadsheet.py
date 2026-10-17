"""Cache new or changed spreadsheet graphs without discarding working copies."""
import concurrent.futures
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

from PIL import Image

ROOT = Path('public/graphs')
SHEET = '1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY'
CATALOGUE = ROOT / 'catalogue.json'
METADATA = ROOT / 'metadata.json'

def normalized(url):
    return url.strip().replace('http://i.imgur.com/', 'https://i.imgur.com/')

def read_sheet():
    url = f'https://docs.google.com/spreadsheets/d/{SHEET}/gviz/tq?tqx=out:csv&sheet=Sheet1'
    request = urllib.request.Request(url, headers={'User-Agent': 'MoviesBassGraphs/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        records = list(csv.reader(io.StringIO(response.read().decode('utf-8-sig'))))
    if not records or not {'id', 'movieName', 'imgurURL'}.issubset(records[0]):
        raise RuntimeError('Spreadsheet headers are missing; saved catalogue left unchanged')
    headers = records[0]
    id_column, title_column = headers.index('id'), headers.index('movieName')
    rows = []
    for cells in records[1:]:
        if not any(cells):
            continue
        if len(cells) <= max(id_column, title_column):
            raise RuntimeError('Incomplete spreadsheet row; saved catalogue left unchanged')
        # A few source titles are split across columns at commas. Locate the URL,
        # then reassemble the title rather than treating its words as a URL.
        url_index = next((i for i in range(title_column + 1, len(cells))
                          if re.match(r'^https?://(?:i\.)?imgur\.com/', cells[i].strip())), None)
        title = ', '.join(part.strip() for part in cells[title_column:url_index]) if url_index else cells[title_column].strip()
        source = cells[url_index].strip() if url_index else ''
        if not title:
            continue
        rows.append({'sheetID': cells[id_column].strip(), 'movieName': title, 'imgurURL': source})
    if not rows:
        raise RuntimeError('Spreadsheet is empty; saved catalogue left unchanged')
    return rows

def recover(row):
    row = dict(row)
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
        row['cachedSourceURL'] = source
        print(f"Cached: {row['movieName']}", flush=True)
        return row, True
    except Exception as error:
        print(f"Kept saved copy for {row['movieName']}: {error}", flush=True)
        return row, False

def main():
    previous = json.loads(CATALOGUE.read_text())
    remote = read_sheet()
    metadata = json.loads(METADATA.read_text()) if METADATA.exists() else {}
    by_id = {str(row['id']): row for row in previous}
    by_source = {normalized(row.get('imgurURL', '')): row for row in previous if row.get('imgurURL')}
    by_title = {row['movieName'].casefold(): row for row in previous}
    occupied = set(by_id)
    used = set()
    pending = []
    for incoming in remote:
        source = normalized(incoming['imgurURL'])
        old = by_source.get(source) or by_title.get(incoming['movieName'].casefold())
        candidate = by_id.get(incoming['sheetID'])
        if old is None and candidate:
            # A changed URL on an existing numbered row should replace that
            # row's graph, while a newly inserted row must not steal its ID.
            if candidate['movieName'] == incoming['movieName'] or incoming['movieName'].startswith(candidate['movieName'] + ','):
                old = candidate
        if old and str(old['id']) in used:
            continue
        if old:
            item = dict(old)
            item['_oldSource'] = old.get('imgurURL', '')
        else:
            identifier = incoming['sheetID']
            if not identifier or identifier in occupied:
                identifier = 'sheet-' + hashlib.sha256((incoming['movieName'] + source).encode()).hexdigest()[:16]
            occupied.add(identifier)
            item = {'id': identifier, 'imagePath': None, '_oldSource': ''}
        used.add(str(item['id']))
        if source != normalized(item.get('cachedSourceURL', item.get('_oldSource', ''))) and item.get('imagePath'):
            item.setdefault('cachedSourceURL', normalized(item.get('_oldSource', '')))
        item['movieName'] = incoming['movieName']
        if source:
            item['imgurURL'] = incoming['imgurURL']
        pending.append(item)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(recover, pending))
    # Spreadsheet deletions do not erase saved graphs or break shared links.
    rows = [row for row, _ in results] + [row for row in previous if str(row['id']) not in used]
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
    for row in rows:
        row.pop('_oldSource', None)
    CATALOGUE.write_text(json.dumps(rows, indent=2) + '\n')
    METADATA.write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'Synced {len(remote)} spreadsheet rows; downloaded {len(changed_images)} graphs; retained {len(rows)} entries.')

if __name__ == '__main__':
    main()
