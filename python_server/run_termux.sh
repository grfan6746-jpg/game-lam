#!/bin/bash
# ========================================================
# 🎮 LOCAL GAME SERVER - Termux One-Click Installer & Runner
# ========================================================

echo "========================================================"
echo "🚀 Updating Termux packages..."
echo "========================================================"
pkg update -y && pkg upgrade -y

echo "📦 Installing Python & Git..."
pkg install python git -y

echo "🐍 Installing Python Dependencies..."
pip install -r requirements.txt

echo "🎮 Starting Local Multiplayer Game Server..."
python app.py
