import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

PROJ_DIR = Path("E:/Dev/animations/ppmc_swat_explainer").resolve()
HTML_URI = (PROJ_DIR / "index.html").as_uri()
OUT_DIR = PROJ_DIR / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR = PROJ_DIR / "temp_frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

with open(PROJ_DIR / "audio" / "metadata.json", "r", encoding="utf-8") as f:
    METADATA = json.load(f)


def render_chapter_video(chapter_idx, max_seconds=None, fps=24):
    ch = METADATA[chapter_idx]
    ch_id = ch["id"]
    duration = max_seconds if max_seconds else ch["duration"]
    total_frames = int(duration * fps)
    audio_path = PROJ_DIR / ch["audio_file"]
    video_out = OUT_DIR / f"{ch_id}.mp4"

    print(f"\n==========================================")
    print(f"Rendering {ch['title']} ({ch_id})")
    print(f"Duration: {duration:.2f}s | FPS: {fps} | Frames: {total_frames}")
    print(f"==========================================")

    # Clean frames dir
    for p in FRAMES_DIR.glob("*.png"):
        p.unlink()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(HTML_URI)
        page.wait_for_timeout(1000)

        # Select chapter and pause audio
        page.evaluate(f"window.app.selectChapter({chapter_idx}, false)")
        page.wait_for_timeout(300)

        # Capture frame by frame
        for f_idx in range(total_frames):
            t = f_idx / fps
            progress = min(1.0, t / duration)
            # Evaluate frame update
            page.evaluate(f"""
                window.app.progressBarFill.style.width = '{(progress * 100):.2f}%';
                window.app.currentTimeEl.textContent = window.app.formatTime({t});
                window.app.renderSceneVisuals({chapter_idx}, {progress}, {t});
            """)
            frame_file = FRAMES_DIR / f"frame_{f_idx:05d}.png"
            page.screenshot(path=str(frame_file))

            if f_idx % (fps * 2) == 0:
                print(f"  Captured frame {f_idx}/{total_frames} ({progress*100:.1f}%)")

        browser.close()

    print(f"Frames captured. Assembling MP4 with FFmpeg...")
    # Assemble with FFmpeg and audio
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", str(FRAMES_DIR / "frame_%05d.png"),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(video_out)
    ]
    subprocess.run(cmd, check=True)
    print(f"Successfully rendered video: {video_out}")
    return video_out


if __name__ == "__main__":
    # Render Chapter 0 as initial showcase sample
    render_chapter_video(0, max_seconds=12, fps=15)
