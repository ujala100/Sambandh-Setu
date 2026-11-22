#!/usr/bin/env bash
# Production build for a long-running host (Render, Railway, a VM). Vercel does not use this file.
# The schema is created automatically on first start. No demo data is ever loaded in production.
set -o errexit
npm ci
