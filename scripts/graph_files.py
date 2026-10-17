"""Give cached graphs title-based filenames without changing their image bytes."""
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import unicodedata

def slug(title):
    title = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9-]+', '_', title.lower()).strip('_')[:150].rstrip('_') or 'graph'

def name_saved_images(rows):
    root = Path('public/graphs')
    by_id = {str(row['id']): row for row in rows}
    counts = Counter(slug(row['movieName']) for row in rows)
    copies = defaultdict(set)
    destinations = {}
    def plan(old, stem):
        if not old or not (Path('public') / old).is_file():
            return old
        target = 'graphs/' + stem + Path(old).suffix.lower()
        if target in destinations and destinations[target] != old:
            raise ValueError(f'Conflicting graph filenames: {target}')
        destinations[target] = old
        copies[old].add(target)
        return target
    for row in rows:
        stem = slug(row['movieName'])
        if counts[stem] > 1:
            stem += '__' + slug(str(row['id'])).replace('-', '_')
        row['imagePath'] = plan(row.get('imagePath'), stem)
        if row.get('sourceImagePath'):
            parent = by_id.get(str(row.get('splitFrom')), row)
            source_stem = slug(parent['movieName']) + '_combined'
            if counts[slug(parent['movieName'])] > 1:
                source_stem += '__' + slug(str(parent['id'])).replace('-', '_')
            row['sourceImagePath'] = plan(row['sourceImagePath'], source_stem)
    # One-time names for older images which are no longer referenced by cards.
    # They remain in the repository, including earlier graph versions.
    legacy_file = Path('scripts/legacy-graph-names.json')
    legacy = json.loads(legacy_file.read_text()) if legacy_file.exists() else {}
    for old, detail in legacy.items():
        if old not in copies:
            plan(old, slug(detail['title']) + '_previous_' + slug(str(detail['id'])).replace('-', '_'))
    for old, targets in copies.items():
        data = (Path('public') / old).read_bytes()
        for target in targets:
            destination = Path('public') / target
            if not destination.exists() or destination.read_bytes() != data:
                destination.write_bytes(data)
    for old in copies:
        if old not in destinations:
            (Path('public') / old).unlink()
    return rows
