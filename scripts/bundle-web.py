#!/usr/bin/env python3
"""Convert the publisher's WEBP VPL archive without changing verse wording.

Usage: python3 scripts/bundle-web.py /path/to/engwebp_vpl.zip
Download: https://ebible.org/Scriptures/engwebp_vpl.zip
"""
import hashlib
import json
import pathlib
import re
import sys
import zipfile

codes = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOL ISA JER LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD REV'.split()
names = 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|')
archive_path = pathlib.Path(sys.argv[1])
archive = zipfile.ZipFile(archive_path)
source = archive.read('engwebp_vpl.txt')
verses = []
for line in source.decode('utf-8-sig').splitlines():
    match = re.fullmatch(r'(\S+) (\d+):(\d+) (.*)', line)
    if not match:
        raise ValueError('Unsupported publisher VPL line')
    code, chapter, verse, text = match.groups()
    verses.append({'book': codes.index(code) + 1, 'chapter': int(chapter), 'verse': int(verse), 'text': text})
coordinates = {(v['book'], v['chapter'], v['verse']) for v in verses}
if len(coordinates) != len(verses) or len({v['book'] for v in verses}) != 66:
    raise ValueError('Invalid publisher coverage')
edition = 'sha256:' + hashlib.sha256(source).hexdigest()
translation = {'id': 'bundled-web', 'edition': edition, 'title': 'World English Bible', 'abbreviation': 'WEB', 'description': 'Publisher WEB Protestant edition (engwebp), American spelling, LORD/GOD; acquired 2026-10-14.', 'language': 'en', 'bundled': True, 'available': True, 'books': [{'number': n + 1, 'name': name, 'aliases': [codes[n]]} for n, name in enumerate(names)], 'verses': verses}
root = pathlib.Path(__file__).resolve().parents[1]
output = root / 'public/bibles/web.json'
output.write_text(json.dumps(translation, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
provenance = {'publisher': 'eBible.org', 'edition': 'World English Bible Protestant, engwebp; American spelling, LORD/GOD, 66 books', 'sourceUrl': 'https://ebible.org/Scriptures/engwebp_vpl.zip', 'catalogUrl': 'https://ebible.org/details.php?id=engwebp', 'noticeUrl': 'https://ebible.org/engwebp/copyright.htm', 'acquiredDate': '2026-10-14', 'sourceArchiveSha256': hashlib.sha256(archive_path.read_bytes()).hexdigest(), 'verseSource': 'engwebp_vpl.txt', 'verseSourceSha256': hashlib.sha256(source).hexdigest(), 'publisherMemberTimestamp': list(archive.getinfo('engwebp_vpl.txt').date_time), 'generatedArtifactSha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'books': 66, 'verses': len(verses), 'terms': 'Bible text public domain. World English Bible is an eBible.org trademark. Preserve the name only for unchanged Scripture text.', 'conversion': 'Remove VPL book/chapter/verse prefix and line separator; preserve remaining text exactly. Publisher VPL already excludes notes, layout, and noncanonical headings.'}
(root / 'public/bibles/web-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
print(json.dumps(provenance, indent=2))
