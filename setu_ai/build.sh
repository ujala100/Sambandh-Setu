#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=========================================="
echo "  Setu AI Microservice - Production Build"
echo "=========================================="

echo "===> Upgrading pip..."
python -m pip install --upgrade pip

echo "===> Installing Python dependencies..."
pip install -r requirements.txt

echo "===> Setu AI build completed successfully!"
