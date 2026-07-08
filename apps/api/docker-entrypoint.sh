#!/bin/sh
set -e

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma

exec "$@"
