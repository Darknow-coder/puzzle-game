# Assembles the trailer of one language from the recorded clips and the overlays.
# Usage: TRAILER_DIR=<dir> python3 tools/trailer/build.py <lang>
# (after: node tools/trailer/record.cjs <dir>/<lang> <lang> and node tools/trailer/overlays.cjs <dir>/ov,
# with the game served on :8080 by node tools/serve.mjs 8080)
import json, subprocess, sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
V = os.environ.get('TRAILER_DIR', '/tmp/lumignons-trailer')  # recorded clips, overlays, outputs
LANG = sys.argv[1]
SRC = f'{V}/{LANG}'
OV = f'{V}/ov'
TMP = f'{V}/tmp-{LANG}'
MUSIC = f'{ROOT}/assets/music/title.mp3'
OUT = f'{V}/lumignons-trailer-{LANG}.mp4'
os.makedirs(TMP, exist_ok=True)
VF = 'fps=30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p'


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def clip(name):
    """Frames of a scene → constant-rate MP4 (cached)."""
    out = f'{TMP}/{name}.mp4'
    if not os.path.exists(out):
        run(['-f', 'concat', '-safe', '0', '-i', f'{SRC}/{name}.txt', '-vf', VF, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', out])
    return out


def cut(src, a, b, out, speed=1.0):
    vf = f'trim={a:.3f}:{b:.3f},setpts=(PTS-STARTPTS)/{speed},{VF}'
    run(['-i', src, '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', out])
    return (b - a) / speed


parts = []
m = json.load(open(f'{SRC}/main.json'))
t = lambda k: m[k] - m['offset']
main = clip('main')
d1 = cut(main, t('ready') - 0.1, t('go'), f'{TMP}/a1.mp4')
d2 = cut(main, t('go'), t('win') + 0.2, f'{TMP}/a2.mp4', speed=1.5)
d3 = cut(main, t('win') + 0.2, t('end') - 0.3, f'{TMP}/a3.mp4')
parts += [f'{TMP}/a1.mp4', f'{TMP}/a2.mp4', f'{TMP}/a3.mp4']
worlds = ['w2-5', 'w3-6', 'w4-5', 'w6-3', 'w7-6', 'w8-5']
dw = 0
for i, w in enumerate(worlds):
    j = json.load(open(f'{SRC}/{w}.json'))
    a = j['go'] - j['offset'] + 0.3
    dw += cut(clip(w), a, a + 2.15, f'{TMP}/b{i}.mp4')
    parts.append(f'{TMP}/b{i}.mp4')
# End card: the card, then the call to action fading in.
DE = 4.6
run(['-loop', '1', '-t', str(DE), '-i', f'{OV}/{LANG}-end.png', '-loop', '1', '-t', str(DE), '-i', f'{OV}/{LANG}-cta.png',
     '-filter_complex', f"[1:v]format=rgba,fade=in:st=0.7:d=0.5:alpha=1[c];[0:v][c]overlay=0:0,{VF},fade=in:st=0:d=0.35",
     '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', f'{TMP}/end.mp4'])
parts.append(f'{TMP}/end.mp4')
with open(f'{TMP}/list.txt', 'w') as f:
    for p in parts:
        f.write(f"file '{p}'\n")
run(['-f', 'concat', '-safe', '0', '-i', f'{TMP}/list.txt', '-c', 'copy', f'{TMP}/body.mp4'])

# Captions on the timeline.
T1 = d1
T2 = T1 + d2
T3 = T2 + d3
T4 = T3 + dw / 2
T5 = T3 + dw
total = T5 + DE
caps = [('a1', 0.15, T1), ('a2', T1, T2), ('a3', T2, T3), ('b1', T3, T4), ('b2', T4, T5)]
inputs = ['-i', f'{TMP}/body.mp4']
for k, _, _ in caps:
    inputs += ['-loop', '1', '-t', f'{total:.2f}', '-i', f'{OV}/{LANG}-{k}.png']
inputs += ['-i', MUSIC]
fc = ''
last = '0:v'
for i, (k, a, b) in enumerate(caps):
    # Each caption fades in and out quickly with its scene.
    fc += f"[{i + 1}:v]format=rgba,fade=in:st={a:.2f}:d=0.25:alpha=1,fade=out:st={b - 0.25:.2f}:d=0.25:alpha=1[c{i}];"
    fc += f"[{last}][c{i}]overlay=0:0:enable='between(t,{a:.2f},{b:.2f})'[v{i}];"
    last = f'v{i}'
mi = len(caps) + 1
fc += f"[{last}]fade=out:st={total - 0.5:.2f}:d=0.5[vout];"
fc += f"[{mi}:a]atrim=0:{total:.2f},afade=in:st=0:d=0.6,afade=out:st={total - 2.2:.2f}:d=2.2,volume=1.1[aout]"
run([*inputs, '-filter_complex', fc, '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.2f}',
     '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
     '-c:a', 'aac', '-b:a', '160k', OUT])
print(LANG, f'{total:.1f}s', OUT, f'{os.path.getsize(OUT) / 1e6:.1f} MB')
