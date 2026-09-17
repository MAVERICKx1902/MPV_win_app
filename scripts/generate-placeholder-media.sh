#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# generate-placeholder-media.sh
#
# Renders the small, offline-friendly placeholder videos + poster frames that
# ship in `public/media`. They stand in for real streams until the Tauri 2.0
# shell hands playback to a native backend (mpv / libmpv / yt-dlp).
#
# Usage:  FFMPEG=/path/to/ffmpeg ./scripts/generate-placeholder-media.sh
#         (defaults to `ffmpeg` on PATH, requires libx264 + libfreetype)
# ---------------------------------------------------------------------------
set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
FONT="${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
FONT_LIGHT="${FONT_LIGHT:-/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf}"
DUR=12
FPS=24
W=1280
H=720
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/media"
mkdir -p "$OUT_DIR"

if [ ! -x "$(command -v "$FFMPEG")" ]; then
  echo "ffmpeg not found (set FFMPEG=/path/to/ffmpeg)" >&2
  exit 1
fi

# slug | series line | episode line | base colour | mid glow | accent A | accent B
CLIPS=(
  "midnight-signal-01|THE MIDNIGHT SIGNAL|EPISODE 01 · COLD BOOT|0x05060F|0x1E2A78|0x7C8CFF|0x38E8D0"
  "neon-district-02|THE MIDNIGHT SIGNAL|EPISODE 02 · NEON DISTRICT|0x0A0512|0x6D1B5A|0xFF5FA2|0xFFB35C"
  "deep-field-03|THE MIDNIGHT SIGNAL|EPISODE 03 · DEEP FIELD|0x03100F|0x0B5F5A|0x5CF2C5|0x63B8FF"
)

# Prints a comma separated list of drawbox filters that fake a soft top-to-bottom
# gradient (used instead of `gradients=` which needs a newer ffmpeg build).
strip_gradient() { # $1 = colour, $2 = steps, $3 = max alpha
  local colour="$1" steps="$2" max="$3" out="" i a sep=""
  for ((i = 0; i < steps; i++)); do
    a=$(awk -v i="$i" -v n="$steps" -v m="$max" 'BEGIN{printf "%.4f", m*(1-(i/n))}')
    out+="${sep}drawbox=x=0:y=$((i * H / steps)):w=$W:h=$((H / steps + 1)):color=${colour}@${a}:t=fill"
    sep=","
  done
  printf '%s' "$out"
}

render() {
  local slug="$1" series="$2" episode="$3" base="$4" glow="$5" accent_a="$6" accent_b="$7"
  echo "  ▸ ${slug}.mp4"
  local grad
  grad="$(strip_gradient "$base" 48 0.55),$(strip_gradient "$glow" 40 0.45)"

  "$FFMPEG" -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=${base}:s=${W}x${H}:r=${FPS}:d=${DUR}" \
    -f lavfi -i "aevalsrc='0.05*sin(2*PI*110*t)*(0.55+0.45*sin(2*PI*t/9))+0.04*sin(2*PI*164.81*t+0.7)+0.03*sin(2*PI*220*t+1.3)+0.018*sin(2*PI*329.63*t)':s=48000:d=${DUR}" \
    -filter_complex "\
[0:v]${grad},\
drawtext=fontfile=${FONT}:text='●':fontsize=820:fontcolor=${accent_a}@0.30:x=760:y=-180,\
drawtext=fontfile=${FONT}:text='●':fontsize=620:fontcolor=${accent_b}@0.22:x=-140:y=380,\
drawtext=fontfile=${FONT}:text='●':fontsize=460:fontcolor=0xFFFFFF@0.10:x=420:y=240,\
gblur=sigma=64,\
geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)'[bg];\
[bg]scale=1500:844,crop=${W}:${H}:x='(in_w-out_w)/2+58*sin(t/5.5)':y='(in_h-out_h)/2+40*cos(t/7)',\
drawtext=fontfile=${FONT_LIGHT}:text='●  PLACEHOLDER STREAM':fontsize=19:fontcolor=0xFFFFFF@0.55:x=72:y=64,\
drawtext=fontfile=${FONT_LIGHT}:text='MPV STUDIO  ·  WEB PREVIEW':fontsize=19:fontcolor=0xFFFFFF@0.40:x=72:y=92,\
drawbox=x=72:y=300:w=112:h=4:color=${accent_b}@0.95:t=fill,\
drawtext=fontfile=${FONT}:text='${series}':fontsize=58:fontcolor=0xFFFFFF@0.96:x=72:y=330:shadowcolor=0x000000@0.5:shadowx=0:shadowy=3,\
drawtext=fontfile=${FONT_LIGHT}:text='${episode}':fontsize=30:fontcolor=${accent_b}@0.95:x=72:y=404,\
drawtext=fontfile=${FONT_LIGHT}:text='wget\: https\\://MPV_win_app/stream/${slug}':fontsize=18:fontcolor=0xFFFFFF@0.38:x=72:y=470,\
drawtext=fontfile=${FONT_LIGHT}:text='00\\:00\\:00':fontsize=18:fontcolor=0xFFFFFF@0.0:x=0:y=0,\
drawtext=fontfile=${FONT_LIGHT}:timecode='00\\:00\\:00\\:00':rate=${FPS}:fontsize=32:fontcolor=0xFFFFFF@0.85:x=72:y=${H}-118,\
drawtext=fontfile=${FONT_LIGHT}:text='REC ●':fontsize=18:fontcolor=${accent_a}@0.9:x=${W}-136:y=64,\
drawbox=x=72:y=${H}-52:w='(1120*t/${DUR})':h=4:color=0xFFFFFF@0.55:t=fill,\
drawbox=x=72:y=${H}-52:w=1120:h=4:color=0xFFFFFF@0.16:t=fill,\
drawbox=x=72:y=${H}-52:w='(1120*t/${DUR})':h=4:color=${accent_b}@1:t=fill,\
noise=alls=4:allf=t+u,\
vignette=PI/5,\
format=yuv420p[v]" \
    -map "[v]" -map 1:a \
    -af "afade=t=in:st=0:d=1.6,afade=t=out:st=$(awk -v d=$DUR 'BEGIN{print d-1.8}'):d=1.8" \
    -c:v libx264 -preset veryfast -crf 30 -g 48 -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 2 -movflags +faststart \
    "$OUT_DIR/${slug}.mp4"

  "$FFMPEG" -y -hide_banner -loglevel error -ss 05 -i "$OUT_DIR/${slug}.mp4" \
    -frames:v 1 -q:v 4 "$OUT_DIR/${slug}.jpg"
}

echo "Rendering placeholder media into public/media …"
for clip in "${CLIPS[@]}"; do
  IFS='|' read -r slug series episode base glow accent_a accent_b <<<"$clip"
  render "$slug" "$series" "$episode" "$base" "$glow" "$accent_a" "$accent_b"
done
echo "Done."
ls -lh "$OUT_DIR"
