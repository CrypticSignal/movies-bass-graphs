"""Digitize coloured curves against OCR-calibrated axes; reject uncertain images."""
import concurrent.futures
import csv
import hashlib
import io
import itertools
import json
import os
from pathlib import Path
import re
import subprocess

import numpy as np
from PIL import Image, ImageOps

ROOT = Path('public/graphs')
OUTPUT = ROOT / 'levels.json'
VERSION = 4
START_HZ = 0.5
STEP_HZ = 0.5
MAX_HZ = 200

def ocr(image, offset=(0, 0), scale=3):
    image = ImageOps.invert(image.convert('L')).resize((image.width * scale, image.height * scale))
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    result = subprocess.run(['tesseract', 'stdin', 'stdout', '--psm', '6', 'tsv'], input=stream.getvalue(), capture_output=True, check=True, timeout=45)
    tokens = []
    for row in csv.DictReader(io.StringIO(result.stdout.decode()), delimiter='\t'):
        if row.get('text', '').strip() and float(row.get('conf', -1)) >= 25:
            tokens.append((row['text'].strip(), offset[0] + (int(row['left']) + int(row['width']) / 2) / scale,
                           offset[1] + (int(row['top']) + int(row['height']) / 2) / scale))
    return tokens

def centres(mask):
    indices = np.flatnonzero(mask)
    if not len(indices):
        return []
    groups = np.split(indices, np.flatnonzero(np.diff(indices) > 1) + 1)
    return [float(np.mean(group)) for group in groups]

def fit_axis(points, tolerance, minimum=4):
    # RANSAC-style consensus: labels occasionally contain OCR mistakes or a
    # second scale. At least four independently read labels must agree.
    best = None
    for first, second in itertools.combinations(points, 2):
        if abs(second[0] - first[0]) < 10:
            continue
        slope = (second[1] - first[1]) / (second[0] - first[0])
        intercept = first[1] - slope * first[0]
        inliers = [p for p in points if abs(p[1] - (slope * p[0] + intercept)) <= tolerance]
        score = len(set(round(p[1], 3) for p in inliers))
        if best is None or score > best[0]:
            best = score, inliers
    if not best or best[0] < minimum:
        raise ValueError('Too few consistent axis labels')
    if len(best[1]) / len(points) < .75:
        raise ValueError('Axis labels disagree; calibration rejected')
    points = np.array(best[1])
    slope, intercept = np.polyfit(points[:, 0], points[:, 1], 1)
    error = float(np.max(np.abs(points[:, 1] - (slope * points[:, 0] + intercept))))
    if error > tolerance:
        raise ValueError('Axis fit exceeds calibration tolerance')
    return float(slope), float(intercept), best[1], error

def analyze(path, manual=None):
    image = Image.open(path).convert('RGB')
    pixels = np.asarray(image).astype(np.int16)
    height, width = pixels.shape[:2]
    if width < 500 or height < 200:
        raise ValueError('Image too small')
    r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
    grey = (np.max(pixels, axis=2) - np.min(pixels, axis=2) < 18) & (r > 45) & (r < 230)
    lines = centres(np.mean(grey[:, int(width * .05):int(width * .90)], axis=1) > .65)
    if len(lines) < 5:
        raise ValueError('Plot grid not detected')
    dark_rows = np.flatnonzero(np.mean(np.max(pixels[:, int(width * .05):int(width * .90)], axis=2) < 45, axis=1) > .65)
    if not len(dark_rows):
        raise ValueError('Plot background uncertain')
    bottom = float(dark_rows[-1] + 1)
    if bottom < height * .6 or bottom > height - 5:
        raise ValueError('Plot boundary uncertain')
    right_width = max(80, int(width * .065))
    if manual is not None:
        if manual['dimensions'] != [width, height]:
            raise ValueError('Manual calibration dimensions do not match image')
        db_points = [tuple(point) for point in manual['dbPoints']]
        frequency_points = [tuple(point) for point in manual['frequencyPoints']]
        db_slope, db_intercept, db_inliers, db_error = fit_axis(db_points, .15)
        hz_slope, hz_intercept, hz_inliers, hz_error = fit_axis(frequency_points, .15, minimum=5)
        if db_slope >= 0 or hz_slope <= 0:
            raise ValueError('Invalid manual axis direction')
        plot_top = min(point[0] for point in db_inliers)
    else:
        labels = ocr(image.crop((width - right_width, 0, width, int(bottom))), (width - right_width, 0))
        db_points = []
        for text, x, y in labels:
            if x < width - right_width * .6:
                continue
            match = re.fullmatch(r'(-?\d{1,3}(?:[.,]\d{1,2})?)(?:dB)?', text, re.I)
            if not match:
                continue
            value = -abs(float(match[1].replace(',', '.')))
            if not -120 <= value <= 0:
                continue
            line = min(lines, key=lambda candidate: abs(candidate - y))
            if 0 <= line - y <= max(14, height * .02):
                db_points.append((line, value))
        db_slope, db_intercept, db_inliers, db_error = fit_axis(db_points, .65)
        if db_slope >= 0 or np.ptp([p[1] for p in db_inliers]) < 20:
            raise ValueError('dB scale uncertain')
        plot_top = min(p[0] for p in db_inliers)
        vertical = centres(np.mean(grey[int(height * .2):int(bottom), :], axis=0) > .65)
        label_top = height - min(60, max(30, int(height * .06)))
        labels = ocr(image.crop((0, label_top, width, height)), (0, label_top))
        frequency_points = []
        for text, x, y in labels:
            match = re.fullmatch(r'(\d{1,3})(?:Hz)?', text, re.I)
            if not match or not vertical:
                continue
            value = int(match[1])
            if not 0 <= value <= 500:
                continue
            line = min(vertical, key=lambda candidate: abs(candidate - x))
            if abs(line - x) <= max(9, width * .007):
                frequency_points.append((line, value))
        hz_slope, hz_intercept, hz_inliers, hz_error = fit_axis(frequency_points, .8, minimum=5)
        if hz_slope <= 0 or np.ptp([p[1] for p in hz_inliers]) < 40:
            raise ValueError('Frequency axis is not reliably linear')
        # Reject a fit based on only one small portion of a differently scaled plot.
        if np.ptp([p[0] for p in hz_inliers]) < width * .5:
            raise ValueError('Insufficient frequency-axis coverage')
    green = (g > 65) & (g > r * 1.5) & (g > b * 1.4)
    red = (r > 70) & (r > g * 1.5) & (r > b * 1.4)
    profiles = {}
    frequency_low = max(START_HZ, min(p[1] for p in hz_inliers))
    frequency_high = min(MAX_HZ, max(p[1] for p in hz_inliers))
    for name, mask in [('green', green), ('red', red)]:
        values = []
        for sample in range(int((MAX_HZ - START_HZ) / STEP_HZ) + 1):
            frequency = START_HZ + sample * STEP_HZ
            x = int(round((frequency - hz_intercept) / hz_slope))
            if not frequency_low <= frequency <= frequency_high or not 2 <= x < width - right_width:
                values.append(None)
                continue
            ys = np.nonzero(mask[int(plot_top):int(bottom), x:x + 1])[0] + int(plot_top)
            if not len(ys) or np.ptp(ys) > max(10, height * .018):
                values.append(None)
                continue
            value = float(np.median(ys)) * db_slope + db_intercept
            values.append(round(value, 1))
        if sum(value is not None for value in values) >= 30:
            profiles[name] = values
    if not profiles:
        raise ValueError('No continuous coloured curves found')
    return {'status': 'estimated', 'profiles': profiles,
            'calibration': {'source': 'manual-axis' if manual is not None else 'ocr', 'frequencyLabels': len(hz_inliers), 'dbLabels': len(db_inliers),
                            'frequencyErrorHz': round(hz_error, 2), 'dbError': round(db_error, 2)},
            'axis': {'hzSlope': hz_slope, 'hzIntercept': hz_intercept, 'dbSlope': db_slope, 'dbIntercept': db_intercept},
            'rangeHz': [frequency_low, frequency_high]}

def main():
    rows = json.loads((ROOT / 'catalogue.json').read_text())
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    cache = previous.get('graphs', {}) if previous.get('version') == VERSION else {}
    calibration_file = Path('scripts/axis-calibrations.json')
    overrides = json.loads(calibration_file.read_text()) if calibration_file.exists() else {}
    def process(row):
        identifier = str(row['id'])
        if not row.get('imagePath'):
            return identifier, {'status': 'unavailable'}
        path = Path('public') / row['imagePath']
        fingerprint = hashlib.sha256(path.read_bytes()).hexdigest()
        manual = overrides.get(fingerprint)
        signature = hashlib.sha256(json.dumps(manual, sort_keys=True).encode()).hexdigest() if manual else None
        if cache.get(identifier, {}).get('fingerprint') == fingerprint and cache[identifier].get('manualCalibration') == signature:
            return identifier, cache[identifier]
        try:
            result = analyze(path, manual)
        except Exception as error:
            result = {'status': 'unreadable', 'reason': str(error)}
        return identifier, {'imagePath': row['imagePath'], 'fingerprint': fingerprint, 'manualCalibration': signature, **result}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        graphs = dict(pool.map(process, rows))
    output = {'version': VERSION, 'startHz': START_HZ, 'stepHz': STEP_HZ, 'maxHz': MAX_HZ, 'graphs': graphs}
    OUTPUT.write_text(json.dumps(output, separators=(',', ':')) + '\n')
    from collections import Counter
    print('Graph analysis:', dict(Counter(row['status'] for row in graphs.values())), flush=True)

if __name__ == '__main__':
    main()

