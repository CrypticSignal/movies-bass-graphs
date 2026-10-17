"""Read only the numbered List of Films in the AVS thread's first post."""
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

THREAD_URL = 'https://www.avsforum.com/threads/the-ultimate-list-of-bass-in-movies-w-frequency-charts-bass-charts-are-on-the-first-page.2763785/'

def image_key(url):
    parts = urllib.parse.urlsplit(url)
    if parts.hostname in ('imgur.com', 'www.imgur.com', 'i.imgur.com'):
        return re.sub(r'\.(png|jpg|jpeg|webp)$', '', parts.path, flags=re.I).strip('/')
    return url

def direct_url(url):
    parts = urllib.parse.urlsplit(url)
    if parts.hostname not in ('imgur.com', 'www.imgur.com', 'i.imgur.com'):
        raise ValueError('Film link is not an Imgur URL')
    if re.fullmatch(r'/[A-Za-z0-9]+(?:\.(?:png|jpg|jpeg|webp))?', parts.path, re.I):
        path = parts.path if '.' in parts.path else parts.path + '.png'
        return 'https://i.imgur.com' + path
    return urllib.parse.urlunsplit(('https', parts.netloc, parts.path, '', ''))

def parse_films(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    # The first post has special markup and is not an article.message--post.
    # Choose its first exact section heading, never later replies or quotes.
    marker = soup.find(string=re.compile(r'^\s*List\s+of\s+Films,?\s*$', re.I))
    if marker is None:
        raise RuntimeError('AVS first-post List of Films heading missing; catalogue unchanged')
    body = marker.find_parent(class_='bbWrapper')
    listing = marker.find_next('ol')
    if body is None or listing is None or body not in listing.parents:
        raise RuntimeError('AVS numbered film list missing; catalogue unchanged')
    rows = []
    for item in listing.find_all('li', recursive=False):
        # A film may contain nested scene links: only its main hyperlink counts.
        links = [a for a in item.find_all('a', href=True)
                 if a.find_parent('li') is item
                 and urllib.parse.urlsplit(a['href']).hostname in ('imgur.com', 'www.imgur.com', 'i.imgur.com')]
        if not links:
            raise RuntimeError('An indexed film has no Imgur hyperlink; catalogue unchanged')
        anchor = links[0]
        title = ' '.join(anchor.get_text(' ', strip=True).replace('\u200b', '').split())
        if not title:
            raise RuntimeError('Empty film title in AVS list; catalogue unchanged')
        rows.append({'movieName': title, 'imgurURL': direct_url(anchor['href'])})
    if len(rows) < 500:
        raise RuntimeError(f'Unexpected AVS film list ({len(rows)} entries); catalogue unchanged')
    return rows

def browser_html():
    import websocket
    chrome = shutil.which('google-chrome') or shutil.which('chromium')
    if not chrome:
        raise RuntimeError('Chrome is required to read the AVS browser check')
    with tempfile.TemporaryDirectory(prefix='avs-reader-', ignore_cleanup_errors=True) as temporary:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            port = probe.getsockname()[1]
        with open(Path(temporary) / 'chrome.log', 'w') as log:
            process = subprocess.Popen([
                'xvfb-run', '-a', chrome, '--no-sandbox', '--no-first-run',
                '--no-default-browser-check', '--disable-extensions', '--disable-dev-shm-usage',
                '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                f'--remote-debugging-port={port}', f'--user-data-dir={temporary}/profile', 'about:blank',
            ], stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            ws = None
            try:
                local = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                pages = None
                for _ in range(45):
                    try:
                        with local.open(f'http://127.0.0.1:{port}/json', timeout=2) as response:
                            pages = json.load(response)
                        if any(p.get('type') == 'page' for p in pages):
                            break
                    except OSError:
                        pass
                    time.sleep(1)
                if not pages:
                    raise RuntimeError('Source browser did not start; catalogue unchanged')
                page = next(p for p in pages if p.get('type') == 'page')
                ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True, timeout=15)
                number = 0
                def command(method, params):
                    nonlocal number
                    number += 1
                    ws.send(json.dumps({'id': number, 'method': method, 'params': params}))
                    while True:
                        reply = json.loads(ws.recv())
                        if reply.get('id') == number:
                            if 'error' in reply:
                                raise RuntimeError('Source browser command failed')
                            return reply.get('result', {})
                command('Page.navigate', {'url': THREAD_URL})
                for _ in range(45):
                    time.sleep(2)
                    reply = command('Runtime.evaluate', {
                        'expression': 'document.documentElement.outerHTML', 'returnByValue': True})
                    html = reply.get('result', {}).get('value', '')
                    if re.search(r'List\s+of\s+Films', html, re.I):
                        return html
                raise RuntimeError('AVS film list did not load; catalogue unchanged')
            finally:
                if ws is not None:
                    ws.close()
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                process.wait(timeout=15)

def read_films():
    # Ordinary HTTP is inexpensive when available; Chrome handles the site's
    # JavaScript check without requiring a user login or stored browser cookies.
    request = urllib.request.Request(THREAD_URL, headers={'User-Agent': 'MoviesBassGraphs/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            html = response.read(5 * 1024 * 1024).decode('utf-8')
        rows = parse_films(html)
    except Exception:
        rows = parse_films(browser_html())
    print(f'AVS List of Films: {len(rows)} numbered films; first: {rows[0]["movieName"]}; last: {rows[-1]["movieName"]}', flush=True)
    return rows
