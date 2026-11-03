#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Build/relink inputs accompany the resulting runtime; no application code enters /out.
set -euo pipefail
mkdir -p /out/runtime-source /out/runtime-build /out/runtime-notices
cp -R /build/runtime /out/runtime-source/type2-runtime
cp /build/build.sh /build/capture.py /build/relink.py /out/runtime-build/
cp /build/LICENSE /out/runtime-build/LICENSE
cp /build/runtime/LICENSE /out/runtime-notices/type2-runtime-LICENSE
apk info -vv > /out/runtime-build/alpine-packages.txt

# Upstream checks the two source archives before building. Retain its temporary
# directory so the exact archives, patched source and build inputs survive.
sed '/^trap cleanup EXIT$/d' /build/runtime/scripts/common/install-dependencies.sh \
    > /build/runtime/scripts/common/retained-dependencies.sh
bash /build/runtime/scripts/common/retained-dependencies.sh
find /tmp -maxdepth 2 -type f \( -name fuse-3.15.0.tar.xz -o -name 0.5.2.tar.gz \) \
    -exec cp '{}' /out/runtime-source/ \;
test -f /out/runtime-source/fuse-3.15.0.tar.xz
test -f /out/runtime-source/0.5.2.tar.gz

cd /build/runtime/src/runtime
# Preserve the pre-link object and link map for replacing the LGPL library.
make CC='clang -v -save-temps=obj' LIBS='-lsquashfuse -lsquashfuse_ll -lzstd -lz -lfuse3 -lmimalloc -Wl,-Map=/out/runtime-build/link.map' \
    2>&1 | tee /out/runtime-build/build.log
cp runtime*.o *.ld Makefile version runtime.c /out/runtime-build/
cp runtime /out/runtime-build/runtime.unstripped
strip --strip-debug --strip-unneeded runtime
printf 'AI\002' | dd of=runtime bs=1 count=3 seek=8 conv=notrunc status=none
cp runtime /out/runtime
python3 /build/capture.py
# Prove the retained object/library inputs can produce a working replacement.
python3 /out/runtime-build/relink.py \
    --fuse-archive /out/runtime-build/link-inputs/usr/lib/libfuse3.a \
    --output /out/runtime-build/relinked-runtime
/out/runtime-build/relinked-runtime --appimage-version
rm /out/runtime-build/relinked-runtime /out/runtime-build/relinked-runtime.map
