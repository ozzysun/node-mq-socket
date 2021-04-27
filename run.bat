@echo off
start cmd /k "forever -a -c "node.exe" start --uid socketserver src/index.js"