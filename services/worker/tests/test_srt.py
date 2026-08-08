from worker.pipeline.transcript import parse_srt


def test_parse_srt(tmp_path):
    p = tmp_path / "a.srt"
    p.write_text(
        """1
00:00:01,000 --> 00:00:03,500
你好世界

2
00:00:04,000 --> 00:00:05,000
第二句
""",
        encoding="utf-8",
    )
    segs = parse_srt(p)
    assert len(segs) == 2
    assert segs[0].text == "你好世界"
    assert abs(segs[0].start - 1.0) < 0.01
