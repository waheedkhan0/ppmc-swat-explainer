import time
from pathlib import Path
from playwright.sync_api import sync_playwright

proj_dir = Path("E:/Dev/animations/ppmc_swat_explainer").resolve()
html_path = (proj_dir / "index.html").as_uri()
qc_dir = proj_dir / "qc"
qc_dir.mkdir(parents=True, exist_ok=True)

print(f"Testing visual animation at {html_path}...")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto(html_path)
    page.wait_for_timeout(1000)

    # Capture screenshots of Chapter 0, Chapter 2, Chapter 4, Chapter 5, Chapter 6
    chapters_to_test = [0, 1, 2, 4, 5, 6, 8, 9]
    for ch in chapters_to_test:
        page.evaluate(f"window.app.selectChapter({ch}, false)")
        page.wait_for_timeout(400)
        screenshot_path = qc_dir / f"chapter_{ch}.png"
        page.screenshot(path=str(screenshot_path))
        print(f"Captured screenshot for Chapter {ch}: {screenshot_path}")

    browser.close()

print("All screenshots captured successfully in qc/ folder!")
