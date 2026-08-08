from __future__ import annotations

import subprocess
from pathlib import Path

from worker.pipeline.types import Keyframe, ensure_dir, format_filename_ts


def _extract_frame(video_path: str, timestamp: float, out_path: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{timestamp:.3f}",
        "-i",
        video_path,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def detect_scene_times(video_path: str, threshold: float = 27.0, max_frames: int = 80) -> list[float]:
    from scenedetect import ContentDetector, SceneManager, open_video

    video = open_video(video_path)
    manager = SceneManager()
    manager.add_detector(ContentDetector(threshold=threshold))
    manager.detect_scenes(video)
    scene_list = manager.get_scene_list()
    times: list[float] = []
    if not scene_list:
        # fallback evenly spaced samples
        duration = float(video.duration.get_seconds()) if video.duration else 0
        if duration <= 0:
            return [0.0]
        step = max(duration / max(1, max_frames), 1.0)
        t = 0.0
        while t < duration and len(times) < max_frames:
            times.append(t)
            t += step
        return times

    for start, _end in scene_list:
        times.append(start.get_seconds())
        if len(times) >= max_frames:
            break
    # always include a near-start frame
    if not times or times[0] > 0.5:
        times.insert(0, 0.0)
    return times[:max_frames]


def extract_keyframes(
    video_path: str,
    images_dir: Path,
    *,
    threshold: float,
    max_frames: int,
) -> list[Keyframe]:
    ensure_dir(images_dir)
    times = detect_scene_times(video_path, threshold=threshold, max_frames=max_frames)
    frames: list[Keyframe] = []
    for idx, t in enumerate(times, start=1):
        name = f"{format_filename_ts(t)}_scene_{idx:03d}.jpg"
        abs_path = images_dir / name
        try:
            _extract_frame(video_path, t, abs_path)
        except subprocess.CalledProcessError:
            continue
        frames.append(
            Keyframe(
                index=idx,
                time=t,
                path=str(abs_path),
                rel_path=f"images/{name}",
            )
        )
    return frames
