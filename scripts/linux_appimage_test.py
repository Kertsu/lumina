from pathlib import Path
import os
import importlib.util
import json
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import linux_appimage as packaging


class LinuxPackagingTests(unittest.TestCase):
    def test_relinking_uses_retained_library_aliases_instead_of_host_libraries(self):
        specification = importlib.util.spec_from_file_location('runtime_relink', Path(packaging.__file__).parent / 'linux-runtime/relink.py')
        relink = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(relink)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'link-command.json').write_text(json.dumps(['/usr/bin/ld', '-L/usr/bin/../lib', '-lmimalloc', '-lfuse3', '-o', 'runtime']))
            (root / 'link-inputs.json').write_text(json.dumps([{
                'path': '/usr/lib/libmimalloc-secure.a',
                'linkPath': '/usr/lib/libmimalloc.a',
            }]))
            with patch.object(relink.shutil, 'which', return_value='/usr/bin/ld'):
                command = relink.relink_command(root, root / 'modified-fuse.a', root / 'custom-runtime')
            self.assertIn(str(root / 'link-inputs/usr/lib/libmimalloc-secure.a'), command)
            self.assertIn(str(root / 'modified-fuse.a'), command)
            self.assertNotIn('-lmimalloc', command)
            self.assertNotIn('-lfuse3', command)
            self.assertIn('-L' + str(root / 'link-inputs/usr/lib'), command)

    def test_optional_codec_removal_regenerates_a_relocatable_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            appdir = Path(directory)
            loaders = appdir / 'usr/lib/gdk-pixbuf-2.0/2.10.0/loaders'
            loaders.mkdir(parents=True)
            for name in ['libpixbufloader-tiff.so', 'io-wmf.a', 'libpixbufloader-bmp.so']:
                (loaders / name).write_bytes(b'native fixture')
            for name in ['libtiff.so.5', 'libjbig.so.0']:
                (appdir / 'usr/lib' / name).write_bytes(b'optional native fixture')
            (appdir / 'usr/lib/libtiff.so').symlink_to('libtiff.so.5')
            with patch.object(packaging, 'run', side_effect=['/usr/bin/query-loaders', '"' + str(loaders / 'libpixbufloader-bmp.so') + '"']):
                packaging.clean_codecs(appdir)
            self.assertEqual([p.name for p in loaders.iterdir()], ['libpixbufloader-bmp.so'])
            self.assertFalse(any(packaging.FORBIDDEN.fullmatch(p.name) for p in appdir.rglob('*')))
            self.assertNotIn(str(appdir), (loaders.parent / 'loaders.cache').read_text())

    def test_removal_refuses_a_remaining_codec_consumer(self):
        with tempfile.TemporaryDirectory() as directory:
            appdir = Path(directory)
            (appdir / 'consumer.so').write_bytes(b'fixture')
            with patch.object(packaging, 'elf_dependencies', return_value=['libtiff.so.5']):
                with self.assertRaisesRegex(ValueError, 'Remaining TIFF/JBIG'):
                    packaging.clean_codecs(appdir)

    def test_native_sources_require_unambiguous_package_ownership(self):
        with tempfile.TemporaryDirectory() as directory:
            appdir = Path(directory)
            library = appdir / 'usr/lib/libsample.so.1'
            library.parent.mkdir(parents=True)
            library.write_bytes(b'fixture')
            with self.assertRaisesRegex(ValueError, 'Missing or ambiguous'):
                packaging.native_inventory(appdir, {})
            package = {
                'name': 'libsample1:amd64',
                'version': '1.2-3',
                'source': 'sample',
                'sourceVersion': '1.2-3',
            }
            host = appdir / 'host/usr/lib/x86_64-linux-gnu' / library.name
            host.parent.mkdir(parents=True)
            host.write_bytes(library.read_bytes())
            records, packages = packaging.native_inventory(appdir, {
                library.name: [(str(host), package)],
            })
            self.assertEqual(records[0]['path'], 'usr/lib/libsample.so.1')
            self.assertEqual(records[0]['sha256'], packaging.digest(library))
            self.assertEqual(packages, {package['name']: package})
            host.write_bytes(b'different package version')
            with self.assertRaisesRegex(ValueError, 'Missing or ambiguous'):
                packaging.native_inventory(appdir, {
                    library.name: [(str(host), package)],
                })

    @unittest.skipUnless(os.name == 'posix', 'Linux launcher runs on POSIX')
    def test_launcher_preserves_working_directory_arguments_and_update_environment(self):
        with tempfile.TemporaryDirectory(prefix='lumina space ') as directory:
            appdir = Path(directory).resolve()
            binary = appdir / 'usr/bin/Lumina POC'
            binary.parent.mkdir(parents=True)
            binary.write_text('#!/bin/sh\nprintf "%s\\n" "$PWD" "$1" "$APPIMAGE" "$GDK_PIXBUF_MODULE_FILE"\n')
            binary.chmod(0o755)
            executable = appdir / 'AppRun'
            executable.write_text(packaging.launcher(binary.name))
            executable.chmod(0o755)
            result = subprocess.check_output([str(executable), 'argument with $ spaces'], text=True, env={
                **os.environ,
                'APPIMAGE': '/downloads/Lumina.AppImage',
            }).splitlines()
            self.assertEqual(result, [
                str(appdir / 'usr'),
                'argument with $ spaces',
                '/downloads/Lumina.AppImage',
                str(appdir / 'usr/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache'),
            ])


if __name__ == '__main__':
    unittest.main()
