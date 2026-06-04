cd /Users/pzhelnov/work/CarDrivePython/games/cardrive
venv/bin/python -m pygbag --cdn "https://pygame-web.github.io/archives/0.9/" --build main.py 2>&1 | tail -1
cd /Users/pzhelnov/work/CarDrivePython
rm -rf public/games/cardrive && mkdir -p public/games/cardrive
cp -r games/cardrive/build/web/. public/games/cardrive/
npm run build 2>&1 | tail -1
export DEVELOPER_DIR=/Library/Developer/CommandLineTools
git add -A && git status --short | grep -v "venv/"