---
module_id: 2
sphere_id: "m2-s3"
title: "Serialization Formats"
title_ru: "Форматы сериализации"
estimated_minutes: 11
prerequisites: []
tags: ["json", "csv", "yaml", "serialization", "security", "interview-classic"]
---

# Serialization Formats

Every script that talks to another system speaks JSON, CSV, or YAML. The mechanics are easy; the *gotchas* are what the interviewer is actually checking. Unicode mangling in JSON output, Windows-only blank lines in CSV writes, and the YAML `load` versus `safe_load` distinction (the one that opens an RCE) — these are the questions that come up.

## Why this matters in interviews

The interviewer assumes you can call `json.dumps`. What they want to know is whether you've been bitten by the failure modes: Cyrillic / Hebrew strings serialized as `אלון` instead of `אלון` in production logs, a CSV that opens with phantom blank rows in Excel, or a YAML config file from an untrusted source that, when fed to `yaml.load`, executes arbitrary code on your server.

---

## Concept 1 — JSON

The four entry points, two pairs:

```python
import json

s = json.dumps(obj)              # object → string
obj = json.loads(s)              # string → object
json.dump(obj, file)             # object → file
obj = json.load(file)            # file   → object
```

The flags that matter in production:

```python
json.dumps(data, indent=2)               # pretty-print (don't ship to wire; do ship to disk)
json.dumps(data, ensure_ascii=False)     # preserve native Unicode (Hebrew, Cyrillic, emoji)
json.dumps(data, sort_keys=True)         # deterministic order — diffable JSON files
json.dumps(obj, default=str)             # fallback for non-serializable (datetime, UUID, ...)
```

`ensure_ascii=True` is the *default*, which escapes every non-ASCII codepoint to `\uXXXX`. That's a footgun: `json.dumps({"name": "אלון"})` returns `'{"name": "\\u05d0\\u05dc\\u05d5\\u05df"}'`, which is technically valid JSON but unreadable in any log or DB column. Flip the flag.

What JSON cannot serialize: `set`, `tuple` (becomes `list` silently), `datetime`, `bytes`, custom objects. `set` and `datetime` raise `TypeError`; pass `default=str` or a custom encoder.

---

## Concept 2 — CSV

`csv.reader` returns rows as lists; `csv.DictReader` returns rows as dicts keyed by header. Prefer the dict form — column-reorder-resilient and reads cleanly:

```python
import csv

with open("data.csv", newline="") as f:
    reader = csv.DictReader(f)
    total = sum(int(row["amount"]) for row in reader)
```

`csv.DictWriter` needs `fieldnames` upfront and an explicit `writeheader()`:

```python
with open("out.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "amount"])
    writer.writeheader()
    writer.writerow({"name": "alice", "amount": 100})
```

**The `newline=""` gotcha** is the interview classic. On Windows, opening a CSV file without `newline=""` causes `csv.writer` to emit `\r\r\n` between rows, producing a blank line between every real row when viewed in Excel. The fix is one keyword argument — but only if you know to add it.

Quoting strategies (`csv.QUOTE_ALL`, `csv.QUOTE_MINIMAL`, `csv.QUOTE_NONNUMERIC`) decide when fields get wrapped in quotes; `QUOTE_MINIMAL` is the default and almost always right.

---

## Concept 3 — YAML: the `safe_load` security gotcha

YAML is the human-editable cousin of JSON. It is everywhere in infrastructure: Docker Compose, Kubernetes manifests, GitHub Actions workflows, Ansible playbooks. PyYAML is third-party (`pip install pyyaml`), not stdlib.

```python
import yaml

data = yaml.safe_load(text)              # use this
yaml.safe_dump(data, stream)
```

The reason `safe_load` exists: PyYAML's `yaml.load(text)` honors tags like `!!python/object:os.system`, which instantiates arbitrary Python objects from the YAML stream. A malicious config file fed to `yaml.load` executes shell commands during parsing — remote code execution from a string that looks like indentation. This is not a theoretical concern; it is in the OWASP top-10 deserialization vulnerabilities and is a standard finding in security audits.

The rule is absolute:

- **Use `yaml.safe_load`. Never `yaml.load` without an explicit `Loader=SafeLoader`** (and even then, the dedicated `safe_load` is preferred because it leaves no room to forget).

`safe_load` accepts only basic types: dicts, lists, strings, numbers, booleans, `None`. Anything tag-based is rejected. That's exactly the right surface for parsing config.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Why does `json.dumps({"x": "א"})` produce `א` and how do you stop it?
2. What types raise `TypeError` from `json.dumps` and how do you handle them?
3. Why open a CSV for writing with `newline=""`?
4. What's the difference between `csv.reader` and `csv.DictReader`?
5. Why is `yaml.load(text)` dangerous, and what do you use instead?

If any of those five feels shaky — re-read that section, then start the cards.
