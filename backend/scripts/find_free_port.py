"""Print the first localhost TCP port >= start that can actually be bound.

A real bind test catches both 'in use' (WinError 10048) and 'access forbidden'
(WinError 10013, e.g. Hyper-V/WSL reserved port ranges), which netstat cannot see.
Usage: python scripts/find_free_port.py [start=8000] [tries=20]
"""
import socket
import sys

start = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
tries = int(sys.argv[2]) if len(sys.argv) > 2 else 20
for port in range(start, start + tries):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
        except OSError as exc:
            print(f"port {port} unavailable: {exc}", file=sys.stderr)
            continue
    print(port)
    sys.exit(0)
sys.exit(1)
