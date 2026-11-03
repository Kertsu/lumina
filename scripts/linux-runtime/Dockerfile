# Same musl build environment as upstream type2-runtime, pinned to Alpine 3.21.8.
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
RUN apk add --no-cache bash alpine-sdk util-linux file autoconf automake libtool \
    xz eudev-dev gettext-dev linux-headers meson zstd-dev zstd-static \
    zlib-dev zlib-static clang musl-dev mimalloc-dev python3 git curl
# Prefer Alpine's retained source archives; abuild still verifies recipe checksums.
ENV DISTFILES_MIRROR=https://distfiles.alpinelinux.org/distfiles/v3.21
COPY runtime /build/runtime
COPY build.sh capture.py relink.py LICENSE /build/
WORKDIR /build
CMD ["bash", "/build/build.sh"]
