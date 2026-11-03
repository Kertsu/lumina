"""Finish Linux redistribution materials before signing the AppImage.

Only third-party sources, runtime build inputs and packaging recipes enter the
source archive. Application binaries, source, data and credentials never do.
"""

from pathlib import Path
import argparse
import hashlib
import html
import json
import os
import re
import shlex
import shutil
import struct
import subprocess
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'linux-appimage.json').read_text())
RUNTIME_COMMIT = CONFIG['runtimeCommit']
SOURCE_ARCHIVE = CONFIG['sourceArchive']
FORBIDDEN = re.compile(r'^(libpixbufloader-tiff\.so|libtiff\.so(?:\..*)?|libjbig\.so(?:\..*)?|io-wmf\.a)$')


def run(*args, cwd=None, env=None):
    return subprocess.check_output(args, cwd=cwd, env=env, text=True).strip()


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(block)
    return checksum.hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def download(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={
        'User-Agent': 'Lumina-release-packaging',
    })
    with urllib.request.urlopen(request, timeout=120) as response, destination.open('wb') as target:
        shutil.copyfileobj(response, target)


def extract_source(archive, destination):
    with tarfile.open(archive) as source:
        for member in source:
            relative = Path(*Path(member.name).parts[1:])
            if not relative.parts:
                continue
            if relative.is_absolute() or '..' in relative.parts or not (member.isfile() or member.isdir()):
                raise ValueError('Unsafe runtime source archive entry')
            target = destination / relative
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.extractfile(member).read())


def build_runtime(work):
    output = work / 'runtime'
    output.mkdir()
    with tempfile.TemporaryDirectory(prefix='runtime-context-', dir=work) as temp:
        context = Path(temp)
        for filename in ['Dockerfile', 'build.sh', 'capture.py', 'relink.py', 'LICENSE']:
            shutil.copy2(ROOT / 'linux-runtime' / filename, context / filename)
        archive = output / 'upstream.tar.gz'
        download('https://api.github.com/repos/AppImage/type2-runtime/tarball/' + RUNTIME_COMMIT, archive)
        if digest(archive) != CONFIG['runtimeSourceSha256']:
            raise ValueError('Pinned AppImage runtime source checksum mismatch')
        extract_source(archive, context / 'runtime')
        image = 'lumina-runtime:' + RUNTIME_COMMIT[:12]
        subprocess.run(['docker', 'build', '--platform', 'linux/amd64', '--build-arg', 'BASE_IMAGE=' + CONFIG['runtimeImage'], '-t', image, str(context)], check=True)
        subprocess.run(['docker', 'run', '--rm', '--platform', 'linux/amd64', '-v', str(output) + ':/out', image], check=True)
        # Docker writes as root; allow the runner to package and clean its output.
        subprocess.run(['sudo', 'chown', '-R', str(os.getuid()) + ':' + str(os.getgid()), str(output)], check=True)
        shutil.copy2(ROOT / 'linux-runtime/Dockerfile', output / 'runtime-build/Dockerfile')
        shutil.copy2(ROOT / 'linux-appimage.json', output / 'runtime-build/build-inputs.json')
    assert (output / 'runtime').is_file()
    return output


def elf_dependencies(path):
    """Read the platform tool's dynamic section, without executing bundled code."""
    with path.open('rb') as stream:
        if stream.read(4) != b'\x7fELF':
            return []
    return re.findall(r'\(NEEDED\).*?\[([^\]]+)\]', run('readelf', '--dynamic', '--wide', str(path)))


def clean_codecs(appdir):
    for path in sorted(appdir.rglob('*')):
        if FORBIDDEN.fullmatch(path.name) or path.suffix in {'.a', '.la'}:
            if path.is_file() or path.is_symlink():
                path.unlink()
    for path in appdir.rglob('*'):
        if path.is_file() and not path.is_symlink():
            if any(FORBIDDEN.fullmatch(name) for name in elf_dependencies(path)):
                raise ValueError('Remaining TIFF/JBIG dependency in ' + str(path.relative_to(appdir)))
    loaders = appdir / 'usr/lib/gdk-pixbuf-2.0/2.10.0/loaders'
    query = run('pkg-config', '--variable=gdk_pixbuf_query_loaders', 'gdk-pixbuf-2.0')
    if not query:
        query = '/usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/gdk-pixbuf-query-loaders'
    modules = sorted(str(path) for path in loaders.glob('*.so'))
    if not modules:
        raise ValueError('No GdkPixbuf modules remain')
    cache = run(query, *modules, env={
        **os.environ,
        'LD_LIBRARY_PATH': str(appdir / 'usr/lib'),
    })
    # A relative cache works after extraction or mounting at any location.
    (loaders.parent / 'loaders.cache').write_text(cache.replace(str(loaders) + '/', '') + '\n')


def launcher(binary):
    if '/' in binary or not binary:
        raise ValueError('Expected a single application binary name')
    return '''#!/bin/sh
set -eu
APPDIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export APPDIR
export OWD="$PWD"
export PATH="$APPDIR/usr/bin:$PATH"
export LD_LIBRARY_PATH="$APPDIR/usr/lib:$APPDIR/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="$APPDIR/usr/share:/usr/share${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
export GTK_DATA_PREFIX="$APPDIR"
export GTK_EXE_PREFIX="$APPDIR/usr"
export GTK_PATH="$APPDIR/usr/lib/gtk-3.0"
export GTK_IM_MODULE_FILE="$APPDIR/usr/lib/gtk-3.0/3.0.0/immodules.cache"
export GSETTINGS_SCHEMA_DIR="$APPDIR/usr/share/glib-2.0/schemas"
export GI_TYPELIB_PATH="$APPDIR/usr/lib/girepository-1.0"
export GIO_MODULE_DIR="$APPDIR/usr/lib/gio/modules"
export GIO_EXTRA_MODULES="$GIO_MODULE_DIR"
export GDK_PIXBUF_MODULEDIR="$APPDIR/usr/lib/gdk-pixbuf-2.0/2.10.0/loaders"
export GDK_PIXBUF_MODULE_FILE="$APPDIR/usr/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"
scheme=$(gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null || true)
case "$scheme" in *prefer-dark*) default_theme=Adwaita:dark;; *) default_theme=Adwaita:light;; esac
export GTK_THEME="${APPIMAGE_GTK_THEME:-$default_theme}"
# Tauri relocates WebKit /usr paths to ././; retain the original launch cwd.
cd "$APPDIR/usr"
exec "$APPDIR/usr/bin"/''' + shlex.quote(binary) + ''' "$@"
'''


def replace_launcher(appdir):
    binaries = [path for path in (appdir / 'usr/bin').iterdir() if path.is_file()]
    if len(binaries) != 1:
        raise ValueError('Expected one Lumina application binary')
    (appdir / 'AppRun').write_text(launcher(binaries[0].name))
    (appdir / 'AppRun').chmod(0o755)
    (appdir / 'AppRun.wrapped').unlink(missing_ok=True)
    shutil.rmtree(appdir / 'apprun-hooks', ignore_errors=True)


def package_database():
    report = run('dpkg-query', '-W', '-f=${binary:Package}\t${Version}\t${source:Package}\t${source:Version}\t${db:Status-Status}\n')
    packages = {}
    for line in report.splitlines():
        name, version, source, source_version, status = line.split('\t')
        if status == 'installed':
            packages[name] = {
                'name': name,
                'version': version,
                'source': source,
                'sourceVersion': source_version,
            }
    files = {}
    for listing in Path('/var/lib/dpkg/info').glob('*.list'):
        package = packages.get(listing.name[:-5])
        if package is None:
            continue
        for name in listing.read_text().splitlines():
            files.setdefault(Path(name).name, []).append((name, package))
    return files


def native_identity(path):
    with path.open('rb') as stream:
        if stream.read(4) != b'\x7fELF':
            return 'sha256', digest(path)
    build_id = re.search(r'Build ID: ([a-f0-9]+)', run('readelf', '--notes', '--wide', str(path)))
    if build_id is None:
        raise ValueError('Native ELF has no package build identity: ' + path.name)
    return 'build-id', build_id[1]


def native_inventory(appdir, database):
    records = []
    packages = {}
    for path in sorted(appdir.rglob('*')):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(appdir).as_posix()
        native = relative.startswith('usr/lib/') and '/notices/' not in relative
        schema = relative.startswith('usr/share/glib-2.0/schemas/')
        if not (native or schema) or path.suffix == '.cache' or path.name == 'gschemas.compiled':
            continue
        suffix = relative[len('usr/lib/'):] if native else relative
        identity = native_identity(path)
        candidates = [
            (name, package) for name, package in database.get(path.name, [])
            if name.endswith('/' + suffix) and Path(name).is_file()
            and native_identity(Path(name)) == identity
        ]
        identities = {(p['source'], p['sourceVersion']) for _, p in candidates}
        if len(identities) != 1:
            raise ValueError('Missing or ambiguous native source ownership: ' + relative)
        owners = {p['name']: p for _, p in candidates}
        packages.update(owners)
        records.append({
            'path': relative,
            'sha256': digest(path),
            'packageIdentity': {
                'kind': identity[0],
                'value': identity[1],
            },
            'packages': sorted(owners),
            'needed': elf_dependencies(path),
        })
    if not records:
        raise ValueError('Empty native library inventory')
    return records, packages


def download_ubuntu_sources(package, destination):
    name, version = package['source'], package['sourceVersion']
    if not re.fullmatch(r'[a-z0-9][a-z0-9+.-]*', name) or not re.fullmatch(r'[A-Za-z0-9.+:~_-]+', version):
        raise ValueError('Invalid Ubuntu source identity')
    destination.mkdir(parents=True, exist_ok=True)
    subprocess.run(['apt-get', '-qq', '-o', 'Acquire::Retries=3', 'source', '--download-only', '--only-source', name + '=' + version], cwd=destination, check=True)
    files = sorted(path for path in destination.iterdir() if path.is_file())
    if not any(path.suffix == '.dsc' for path in files):
        raise ValueError('Missing Ubuntu source descriptor: ' + name)
    return [{
        'file': path.name,
        'sha256': digest(path),
    } for path in files]


def add_native_notices(appdir, work, packages, runtime):
    documentation = appdir / 'usr/share/doc'
    allowed = {name.split(':', 1)[0] for name in packages}
    if documentation.exists():
        for directory in documentation.iterdir():
            if directory.is_dir() and directory.name not in allowed:
                shutil.rmtree(directory)
    for name in sorted(allowed):
        original = Path('/usr/share/doc') / name / 'copyright'
        if not original.is_file():
            raise ValueError('Missing native copyright: ' + name)
        target = documentation / name / 'copyright'
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, target)
    common = appdir / 'usr/share/common-licenses'
    shutil.copytree('/usr/share/common-licenses', common, symlinks=False)
    shutil.copytree(runtime / 'runtime-notices', documentation / 'lumina-runtime')
    sections = []
    for parent in [documentation, common]:
        for path in sorted(parent.rglob('*')):
            if path.is_file():
                sections.append('<h3>' + html.escape(path.relative_to(appdir).as_posix()) + '</h3><pre>' + html.escape(path.read_text(errors='strict')) + '</pre>')
    supplement = '<section id="linux-native"><h2>Linux native libraries and AppImage runtime</h2><p>Matching third-party sources, patches and runtime relinking inputs accompany this release in its third-party source archive. These components retain their own rights; this archive contains no Lumina application source.</p>' + ''.join(sections) + '</section>'
    resource = next(appdir.glob('usr/lib/*/notices/THIRD-PARTY-NOTICES.html'), None)
    if resource is None:
        raise ValueError('Missing bundled application dependency notices')
    original = resource.read_text()
    if original.count('</html>') != 1 or 'id="linux-native"' in original:
        raise ValueError('Unexpected notices document')
    resource.write_text(original.replace('</html>', supplement + '</html>'))
    shutil.copyfile(resource, work.parent / 'bundled-notices/THIRD-PARTY-NOTICES.html')
    return resource


def smoke_images(appdir, source, work):
    bmp = work / 'pixel.bmp'
    # One white pixel, 24-bit uncompressed BMP; exercise the remaining BMP loader.
    bmp.write_bytes(b'BM' + struct.pack('<IHHI', 58, 0, 0, 54) + struct.pack('<IiiHHIIiiII', 40, 1, 1, 1, 24, 0, 4, 0, 0, 0, 0) + b'\xff\xff\xff\0')
    env = {
        **os.environ,
        'LD_LIBRARY_PATH': str(appdir / 'usr/lib'),
        'GDK_PIXBUF_MODULEDIR': str(appdir / 'usr/lib/gdk-pixbuf-2.0/2.10.0/loaders'),
        'GDK_PIXBUF_MODULE_FILE': str(appdir / 'usr/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache'),
    }
    for image in [source / 'src-tauri/icons/32x32.png', source / 'public/backgrounds/mountains.jpg', bmp]:
        subprocess.run(['gdk-pixbuf-csource', '--raw', str(image)], env=env, stdout=subprocess.DEVNULL, check=True)


def compose_appimage(appdir, runtime, destination, work):
    filesystem = work / 'payload.squashfs'
    subprocess.run(['mksquashfs', str(appdir), str(filesystem), '-noappend', '-comp', 'zstd', '-all-root', '-no-progress'], check=True)
    with destination.open('wb') as output:
        for path in [runtime, filesystem]:
            with path.open('rb') as stream:
                shutil.copyfileobj(stream, output)
    destination.chmod(0o755)
    offset = int(run(str(destination), '--appimage-offset'))
    if offset != runtime.stat().st_size:
        raise ValueError('Runtime offset does not match the composed filesystem')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--tauri-version', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-beta\.\d+)?', args.version) or not re.fullmatch(r'\d+\.\d+\.\d+', args.tauri_version):
        raise ValueError('Invalid package version')
    source = args.source.resolve()
    bundle = source / 'target/x86_64-unknown-linux-gnu/release/bundle/appimage'
    appdirs = list(bundle.glob('*.AppDir'))
    appimages = list(bundle.glob('*.AppImage'))
    if len(appdirs) != 1 or len(appimages) != 1:
        raise ValueError('Expected one retained AppDir and AppImage')
    appdir, appimage = appdirs[0], appimages[0]
    work = source / 'target/linux-native'
    if work.exists():
        shutil.rmtree(work)
    work.mkdir()
    clean_codecs(appdir)
    replace_launcher(appdir)
    records, packages = native_inventory(appdir, package_database())
    runtime = build_runtime(work)
    archive_root = work / 'third-party-sources'
    archive_root.mkdir()
    shutil.move(str(runtime), archive_root / 'runtime')
    runtime = archive_root / 'runtime'
    sources = {}
    for package in packages.values():
        identity = package['source'] + '=' + package['sourceVersion']
        if identity not in sources:
            sources[identity] = download_ubuntu_sources(package, archive_root / 'ubuntu' / package['source'])
    recipe = archive_root / 'packaging'
    recipe.mkdir()
    shutil.copyfile(__file__, recipe / 'linux_appimage.py')
    shutil.copyfile(ROOT / 'linux-appimage.json', recipe / 'linux-appimage.json')
    shutil.copytree(ROOT / 'linux-runtime', recipe / 'linux-runtime')
    # The public bundler source records native RPATH and WebKit path relocations.
    download('https://api.github.com/repos/tauri-apps/tauri/tarball/tauri-cli-v' + args.tauri_version, archive_root / 'tauri-bundler-source.tar.gz')
    manifest = {
        'schemaVersion': 1,
        'runtimeCommit': RUNTIME_COMMIT,
        'tauriVersion': args.tauri_version,
        'packages': sorted(packages.values(), key=lambda p: p['name']),
        'sources': sources,
        'files': records,
        'packagingChanges': ['RPATH relocation and WebKit /usr path relocation by the versioned Tauri bundler', 'Optional TIFF/JBIG and unused static archives removed', 'Application-specific shell AppRun'],
    }
    write_json(archive_root / 'manifest.json', manifest)
    (archive_root / 'README.txt').write_text('Third-party sources accompanying Lumina ' + args.version + '.\n\nUbuntu: unpack each .dsc with dpkg-source -x; it identifies the exact upstream source and distro patches/build rules.\nRuntime: runtime-source contains the pinned source and verified Alpine source packages; runtime-build contains the link command, pre-link object and actual static library/CRT inputs. The retained Dockerfile and build-inputs.json identify the build environment.\nTo relink the runtime with a modified compatible libfuse3.a, install the recorded Alpine build tools, then run: python3 runtime/runtime-build/relink.py --fuse-archive /path/to/modified/libfuse3.a --output /path/to/custom-runtime\nUse that custom runtime with the extracted AppDir through compose_appimage in packaging/linux_appimage.py, or an AppImage tool accepting --runtime-file. Rebuilding libfuse uses the supplied original source, mount.c patch and runtime build.sh recipe.\nNative path relocations use the supplied versioned Tauri bundler source. packaging contains the final AppDir cleanup/composition recipe. Native library rights include replacing/debugging modified libraries; the AppImage can be extracted with --appimage-extract and its AppRun executed. No Lumina application source, credentials or user data are included.\n')
    resource = add_native_notices(appdir, work, packages, runtime)
    shutil.copytree(appdir / 'usr/share/doc', archive_root / 'notices/doc', symlinks=False)
    shutil.copytree(appdir / 'usr/share/common-licenses', archive_root / 'notices/common-licenses', symlinks=False)
    smoke_images(appdir, source, work)
    subprocess.run(['tar', '--zstd', '-cf', str(work / SOURCE_ARCHIVE), '-C', str(work), 'third-party-sources'], check=True)
    final = work / 'corrected.AppImage'
    compose_appimage(appdir, runtime / 'runtime', final, work)
    # Inspect the actual composed payload, not just the source AppDir.
    with tempfile.TemporaryDirectory(prefix='inspect-', dir=work) as directory:
        subprocess.run([str(final), '--appimage-extract'], cwd=directory, check=True, stdout=subprocess.DEVNULL)
        extracted = Path(directory) / 'squashfs-root'
        for item in records:
            if digest(extracted / item['path']) != item['sha256']:
                raise ValueError('Final native payload changed: ' + item['path'])
        if (extracted / resource.relative_to(appdir)).read_bytes() != resource.read_bytes():
            raise ValueError('Final package lost its complete notices')
        if any(FORBIDDEN.fullmatch(path.name) for path in extracted.rglob('*')):
            raise ValueError('Forbidden codec returned in final AppImage')
        smoke_images(extracted, source, work)
    final.replace(appimage)
    print('Linux AppImage verified: no TIFF/JBIG; PNG/JPEG/BMP decode; native notices and matching sources retained.', flush=True)


if __name__ == '__main__':
    main()
