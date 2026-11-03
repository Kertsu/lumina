# Same musl build environment as upstream type2-runtime, pinned to Alpine 3.21.8.
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
RUN apk add --no-cache bash alpine-sdk util-linux file autoconf automake libtool \
    xz eudev-dev gettext-dev linux-headers meson zstd-dev zstd-static \
    zlib-dev zlib-static clang musl-dev mimalloc-dev python3 git curl
COPY runtime /build/runtime
COPY build.sh capture.py relink.py LICENSE /build/
WORKDIR /build
CMD ["bash", "/build/build.sh"]
