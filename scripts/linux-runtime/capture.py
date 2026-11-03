"""Retain the actual runtime link inputs and their verified Alpine sources."""

from pathlib import Path
import hashlib
import json
import re
import shlex
import shutil
import subprocess
import tarfile


def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


out = Path('/out')
packages = {}
for block in Path('/lib/apk/db/installed').read_text().split('\n\n'):
    fields = dict(line.split(':', 1) for line in block.splitlines() if ':' in line)
    if 'P' in fields:
        packages[fields['P']] = fields

inputs = set(re.findall(r'/[^\s()]+\.(?:a|o)\b', (out / 'runtime-build/link.map').read_text()))
assert inputs, 'No static runtime inputs found in linker map'
origins = {}
inventory = []
for name in sorted(inputs):
    path = Path(name).resolve()
    assert path.is_file(), f'Missing runtime link input: {name}'
    destination = out / 'runtime-build/link-inputs' / str(path).lstrip('/')
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
    owner = subprocess.run(['apk', 'info', '--who-owns', str(path)], capture_output=True, text=True)
    package = None
    if owner.returncode == 0:
        owner_version = owner.stdout.strip().rsplit(' ', 1)[-1]
        matches = [p for p in packages.values() if p['P'] + '-' + p['V'] == owner_version]
        assert len(matches) == 1, f'Unknown APK owner: {owner_version}'
        package = matches[0]
        assert re.fullmatch(r'[a-z0-9][a-z0-9+_.-]*', package['o'])
        assert re.fullmatch(r'[a-f0-9]{40}', package['c'])
        origins[package['o'], package['c']] = package
    else:
        assert path.name in {'libfuse3.a', 'libsquashfuse.a', 'libsquashfuse_ll.a'}, f'Unowned runtime link input: {name}'
    inventory.append({
        'path': str(path),
        'linkPath': name,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'package': None if package is None else {
            'name': package['P'],
            'version': package['V'],
            'origin': package['o'],
            'commit': package['c'],
            'license': package.get('L'),
        },
    })

for (origin, commit), package in sorted(origins.items()):
    checkout = Path('/build/aports') / commit
    if not checkout.exists():
        run('git', 'init', str(checkout))
        run('git', '-C', str(checkout), 'remote', 'add', 'origin', 'https://github.com/alpinelinux/aports.git')
        run('git', '-C', str(checkout), 'config', 'core.sparseCheckout', 'true')
    sparse = checkout / '.git/info/sparse-checkout'
    with sparse.open('a') as stream:
        stream.write(f'/main/{origin}/\n/community/{origin}/\n')
    run('git', '-C', str(checkout), '-c', 'protocol.version=2', 'fetch', '--filter=blob:none', '--depth=1', 'origin', commit)
    run('git', '-C', str(checkout), 'checkout', '--detach', 'FETCH_HEAD')
    run('git', '-C', str(checkout), 'sparse-checkout', 'reapply')
    recipe = next((checkout / section / origin for section in ['main', 'community'] if (checkout / section / origin / 'APKBUILD').is_file()), None)
    assert recipe is not None, f'Missing exact source recipe: {origin}@{commit}'
    source_dir = out / 'runtime-source/alpine' / (origin + '-' + commit)
    source_dir.mkdir(parents=True)
    shutil.copytree(recipe, source_dir / 'recipe')
    # srcpkg checks upstream checksums and retains APKBUILD, patches and sources.
    subprocess.run(['abuild', '-F', '-s', str(source_dir / 'distfiles'), '-P', str(source_dir / 'packages'), 'srcpkg'], cwd=recipe, check=True)
    assert list((source_dir / 'packages').rglob('*.src.tar.gz')), f'No source package for {origin}'
    # srcpkg contains every verified source file; keep one copy of large inputs.
    shutil.rmtree(source_dir / 'distfiles')

(out / 'runtime-build/link-inputs.json').write_text(json.dumps(inventory, indent=2) + '\n')
commands = [shlex.split(line.strip()) for line in (out / 'runtime-build/build.log').read_text().splitlines() if re.match(r'^\s*"?/[^ ]*/ld(?:\.lld)?"? ', line)]
assert len(commands) == 1, 'Expected one explicit runtime link command'
(out / 'runtime-build/link-command.json').write_text(json.dumps(commands[0], indent=2) + '\n')


def licenses(archive, prefix, depth=0):
    """Copy unchanged full notices from source packages and their source tarballs."""
    with tarfile.open(archive) as source:
        for member in source:
            if not member.isfile():
                continue
            relative = Path(member.name)
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError('Unsafe source archive path')
            if re.match(r'(?i)^(copying|copyright|licen[sc]e|notice|[al]?gpl)([0-9._-]|$)', relative.name):
                target = out / 'runtime-notices' / prefix / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.extractfile(member).read())
            elif depth == 0 and re.search(r'\.(tar\.(gz|xz|bz2)|tgz)$', member.name):
                nested = Path('/build/nested-sources') / prefix / relative
                nested.parent.mkdir(parents=True, exist_ok=True)
                nested.write_bytes(source.extractfile(member).read())
                licenses(nested, prefix + '/' + relative.name, depth=1)


for archive in sorted((out / 'runtime-source').rglob('*.src.tar.gz')):
    licenses(archive, archive.parent.parent.parent.name)
licenses(out / 'runtime-source/fuse-3.15.0.tar.xz', 'fuse')
licenses(out / 'runtime-source/0.5.2.tar.gz', 'squashfuse')
for component in ['musl', 'zstd', 'zlib', 'mimalloc', 'fuse', 'squashfuse']:
    assert any(component in str(p) for p in (out / 'runtime-notices').rglob('*') if p.is_file()), f'Missing full runtime notices: {component}'
assert any(p.name == 'LGPL2.txt' for p in (out / 'runtime-notices/fuse').rglob('*')), 'Missing complete libfuse license'
