export interface PythonFile {
  path: string;
  descriptionFa: string;
  content: string;
}

export const PYTHON_FILES: PythonFile[] = [
  {
    path: 'requirements.txt',
    descriptionFa: 'کتابخانه‌های پایتون مورد نیاز',
    content: `flask>=3.0.0
flask-socketio>=5.3.6
python-socketio>=5.11.0
eventlet>=0.35.0
qrcode>=7.4.2`,
  },
  {
    path: 'run_termux.sh',
    descriptionFa: 'اسکریپت راه‌اندازی خودکار در Termux',
    content: `#!/bin/bash
# 🎮 اجرای خودکار سرور در Termux
echo "========================================"
echo "🚀 آماده‌سازی و ارتقای مخازن Termux..."
echo "========================================"
pkg update -y && pkg upgrade -y

echo "📦 نصب پایتون و ابزارها..."
pkg install python git -y

echo "🐍 نصب کتابخانه‌های Flask و WebSocket..."
pip install -r requirements.txt

echo "🎮 شروع سرور بازی محلی..."
python app.py`,
  },
  {
    path: 'app.py',
    descriptionFa: 'فایل اصلی سرور Flask + Flask-SocketIO',
    content: `"""
=============================================================================
🎮 LOCAL GAME SERVER (Termux / Android / LAN)
Flask + Flask-SocketIO 2-Player Real-Time Game Suite
=============================================================================
"""

import os
import socket
import random
import string
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'local-game-termux-secret-key-2026'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

rooms = {}

def get_local_ip():
    """Finds the LAN IP address of the Termux Android phone."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def generate_room_id():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=5))

@app.route('/')
def index():
    return "<h1>Local Game Server Running!</h1>"

if __name__ == '__main__':
    port = 8080
    ip = get_local_ip()
    print("=" * 50)
    print("🎮 LOCAL GAME SERVER")
    print(f"Open on this phone: http://127.0.0.1:{port}")
    print(f"Open on another device: http://{ip}:{port}")
    print("=" * 50)
    socketio.run(app, host='0.0.0.0', port=port, debug=False)`,
  },
];
