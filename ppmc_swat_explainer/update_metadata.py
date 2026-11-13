import subprocess
import json
from pathlib import Path

proj_dir = Path("E:/Dev/animations/ppmc_swat_explainer")
meta_path = proj_dir / "audio" / "metadata.json"

with open(meta_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    fpath = proj_dir / item["audio_file"]
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(fpath)],
        capture_output=True,
        text=True
    )
    dur = float(res.stdout.strip())
    item["duration"] = round(dur, 2)
    # also update the individual json
    indiv_json = proj_dir / "audio" / f"{item['id']}.json"
    if indiv_json.exists():
        with open(indiv_json, "r", encoding="utf-8") as jf:
            indiv_data = json.load(jf)
        indiv_data["duration"] = round(dur, 2)
        with open(indiv_json, "w", encoding="utf-8") as jf:
            json.dump(indiv_data, jf, indent=2)

with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Successfully updated metadata.json!")
for item in data:
    print(f"{item['id']}: {item['duration']}s")
