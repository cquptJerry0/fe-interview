import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "fetch_reference_boards.sh"


class FetchReferenceBoardsTest(unittest.TestCase):
    def test_missing_manifest_fails_without_creating_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = subprocess.run(
                ["bash", str(SCRIPT), "missing.json", "output"],
                cwd=root, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 2)
            self.assertFalse((root / "output").exists())

    def test_exports_to_explicit_relative_and_absolute_directories(self):
        for absolute in (False, True):
            with self.subTest(absolute=absolute), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                token = "test-board-token"
                manifest = root / "manifest.json"
                manifest.write_text(json.dumps({"boards": [
                    {"id": "sample", "cn": "Sample", "token": token}
                ]}))
                binary = root / "bin"
                binary.mkdir()
                cli = binary / "lark-cli"
                cli.write_text(
                    "#!/usr/bin/env python3\n"
                    "import pathlib, sys\n"
                    "args = sys.argv[1:]\n"
                    "assert args[:2] == ['whiteboard', '+query']\n"
                    "def arg(name): return args[args.index(name) + 1]\n"
                    "kind = arg('--output_as')\n"
                    "ext = 'png' if kind == 'image' else 'json'\n"
                    "target = pathlib.Path(arg('--output')) / "
                    "('whiteboard_' + arg('--whiteboard-token') + '.' + ext)\n"
                    "target.write_bytes(b'preview' if kind == 'image' else b'{\"nodes\": []}')\n"
                )
                cli.chmod(0o755)
                target = root / "export with spaces"
                result = subprocess.run(
                    ["bash", str(SCRIPT), str(manifest), str(target) if absolute else target.name],
                    cwd=root, capture_output=True, text=True,
                    env={**os.environ, "PATH": str(binary) + os.pathsep + os.environ["PATH"]},
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual((target / "previews/sample.png").read_bytes(), b"preview")
                self.assertEqual(json.loads((target / "raw/sample.json").read_text()), {"nodes": []})
                self.assertNotIn(token, result.stdout)
                self.assertFalse(list(target.rglob("whiteboard_*")))


if __name__ == "__main__":
    unittest.main()
