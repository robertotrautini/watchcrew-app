#!/usr/bin/env python3
"""Resolve Maestro areas/flows for scripts/maestro-all.sh (data: .maestro/areas.json).

  maestro-areas.py list                       human readable area list
  maestro-areas.py flows <area>[,<area>...]   flow names (one per line)
  maestro-areas.py smoke                      smoke flow names
  maestro-areas.py changed [--base REF]       areas derived from git (read-only); prints
                                              'AREA <name>' / 'FULL' / 'FLOW <name>' / 'UNMAPPED <file>' lines
Exit 2 on unknown area.
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = json.load(open(os.path.join(ROOT, ".maestro", "areas.json")))


def rx(pattern):
    out, i = "", 0
    while i < len(pattern):
        c = pattern[i]
        if pattern[i:i + 3] == "**/":
            out += "(?:.*/)?"; i += 3; continue
        if pattern[i:i + 2] == "**":
            out += ".*"; i += 2; continue
        out += "[^/]*" if c == "*" else re.escape(c)
        i += 1
    return re.compile("^" + out + "$")


def match(path, patterns):
    return any(rx(p).match(path) for p in patterns)


def git_files(base):
    if os.environ.get("MAESTRO_CHANGED_FILES"):  # test hook: space-separated paths instead of git
        return os.environ["MAESTRO_CHANGED_FILES"].split()
    def run(*args):
        return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True).stdout.splitlines()
    files = set(run("diff", "--name-only", base)) | set(run("diff", "--name-only", "--cached"))
    for line in run("status", "--porcelain"):
        p = line[3:].split(" -> ")[-1].strip().strip('"')
        files.add(p)
    return sorted(f for f in files if f)


def main():
    a = sys.argv[1:]
    cmd = a[0] if a else "list"
    areas = DATA["areas"]
    if cmd == "list":
        for n, v in areas.items():
            print(f"{n:18} {', '.join(v['flows'])}\n{'':18} {v['description']}")
        print(f"{'smoke':18} {', '.join(DATA['smoke']['flows'])}\n{'':18} {DATA['smoke']['description']}")
    elif cmd == "flows":
        seen = []
        for n in a[1].split(","):
            if n not in areas:
                print(f"unknown area '{n}'. Known: {', '.join(areas)}", file=sys.stderr); sys.exit(2)
            seen += [f for f in areas[n]["flows"] if f not in seen]
        print("\n".join(seen))
    elif cmd == "smoke":
        print("\n".join(DATA["smoke"]["flows"]))
    elif cmd == "changed":
        base = a[a.index("--base") + 1] if "--base" in a else "HEAD"
        hit, full, flows, unmapped = [], False, [], []
        for f in git_files(base):
            if match(f, DATA["ignore"]):
                continue
            m = re.match(r"^\.maestro/flows/([^/]+)\.yaml$", f)
            if m:
                flows.append(m.group(1)); continue
            if match(f, DATA["full"]["paths"]):
                full = True; continue
            ar = [n for n, v in areas.items() if match(f, v["paths"])]
            if ar:
                hit += [n for n in ar if n not in hit]
            else:
                unmapped.append(f)
        if full:
            print("FULL")
        for n in hit:
            print("AREA", n)
        for n in dict.fromkeys(flows):
            print("FLOW", n)
        for f in unmapped:
            print("UNMAPPED", f)
    else:
        print(__doc__); sys.exit(2)


main()
