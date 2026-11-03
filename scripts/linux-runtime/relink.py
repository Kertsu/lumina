"""Relink the supplied runtime object with a replacement static libfuse archive."""

from pathlib import Path
import argparse
import json
import posixpath
import shutil
import subprocess

def relink_command(root, fuse, output):
    command = json.loads((root / 'link-command.json').read_text())
    inputs = json.loads((root / 'link-inputs.json').read_text())
    aliases = {}
    libraries = {}
    for item in inputs:
        retained = root / 'link-inputs' / item['path'].lstrip('/')
        for name in [item['path'], item['linkPath']]:
            aliases[posixpath.normpath(name)] = retained
            if name.endswith('.a'):
                basename = Path(name).name
                if basename in libraries and libraries[basename] != retained:
                    raise ValueError('Ambiguous retained static library: ' + basename)
                libraries[basename] = retained
    linker = shutil.which(Path(command[0]).name)
    if linker is None:
        raise ValueError('Install the linker recorded in the supplied build environment')
    result = [linker]
    skip_output = False
    for item in command[1:]:
        if skip_output:
            result.append(str(output))
            skip_output = False
        elif item == '-o':
            result.append(item)
            skip_output = True
        elif item == '-lfuse3':
            result.append(str(fuse))
        elif item.startswith('-l'):
            name = item[2:]
            archive = name[1:] if name.startswith(':') else 'lib' + name + '.a'
            if archive not in libraries:
                raise ValueError('Missing retained static library: ' + archive)
            result.append(str(libraries[archive]))
        elif item.startswith('-L/'):
            result.append('-L' + str(root / 'link-inputs' / posixpath.normpath(item[2:]).lstrip('/')))
        elif item.startswith('/') and (item.endswith('.o') or item.endswith('.a')):
            result.append(str(aliases[posixpath.normpath(item)]))
        elif item.startswith('-Map='):
            result.append('-Map=' + str(output) + '.map')
        else:
            result.append(item)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fuse-archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    output = args.output.resolve()
    subprocess.run(relink_command(root, args.fuse_archive.resolve(strict=True), output), cwd=root, check=True)
    subprocess.run(['strip', '--strip-debug', '--strip-unneeded', str(output)], check=True)
    with output.open('r+b') as stream:
        stream.seek(8)
        stream.write(b'AI\x02')
    print(output)


if __name__ == '__main__':
    main()
