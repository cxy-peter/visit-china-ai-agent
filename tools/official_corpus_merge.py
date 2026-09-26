"""Preserve the URL index when refreshing a smaller batch of fetched articles."""
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path


def merge_rows(previous, fetched):
    rows = {r['url']: dict(r) for r in previous}
    if len(rows) != len(previous):
        raise ValueError('Prior corpus contains duplicate URLs')
    for new in fetched:
        if new.get('fetch_status') != 200 or not new.get('content_sha256'):
            raise ValueError('Refresh must contain successfully fetched metadata')
        old = rows.get(new['url'])
        # A delayed collection must not replace a newer observation.
        if old and old.get('retrieved_at', '') > new.get('retrieved_at', ''):
            continue
        row = {**(old or {}), **new}
        if old:
            row['id'] = old['id']
        # A fetch does not carry forward editorial approval or an old summary.
        for key in ('summary', 'summaryZh', 'reviewedAt', 'publicationHash'):
            row.pop(key, None)
        row['editorial_status'] = 'not_reviewed'
        row['operational_status'] = 'requires_freshness_and_applicability_check'
        rows[new['url']] = row
    result = sorted(rows.values(), key=lambda r: (r['city'], r['url']))
    if len({r['id'] for r in result}) != len(result):
        raise ValueError('Corpus ID collision')
    return result


def save_refresh(output, previous, fetched, previous_report, batch_report):
    output = Path(output)
    rows = merge_rows(previous, fetched)
    target = max(previous_report.get('requested_target', 0), batch_report['requested_target'])
    text = json.dumps(rows, ensure_ascii=False, indent=2) + '\n'
    report = {
        **previous_report,
        'finished_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'requested_target': target,
        'unique_index_urls': len(rows),
        'target_met': len(rows) >= target,
        'preserved_prior_rows': previous_report.get('preserved_prior_rows', len(previous)),
        'preserved_index_urls': len(previous),
        'last_batch_fetched_pages': len(fetched),
        'last_batch_target_met': batch_report['target_met'],
        'last_batch_new_urls': len({r['url'] for r in rows} - {r['url'] for r in previous}),
        'unique_fetched_pages': sum(r.get('fetch_status') == 200 for r in rows),
        'body_not_fetched': sum(r.get('fetch_status') is None for r in rows),
        'reviewed_for_current_policy': 0,
        'by_city': dict(collections.Counter(r['city'] for r in rows)),
        'by_publisher': dict(collections.Counter(r['publisher'] for r in rows)),
        'topic_counts_nonexclusive': dict(collections.Counter(t for r in rows for t in r['topics'])),
        'records_hash_normalization': 'UTF-8 bytes with CRLF normalized to LF',
        'records_sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
        'count_definition': 'Unique official article URLs, preserving prior discovery leads. A successful body fetch is not editorial review; index-only rows remain body_not_fetched. The latest fetched batch is incremental, never a replacement corpus.',
    }
    # Old capture hashes describe the old snapshot, not this union.
    report.pop('records_capture_sha256', None)
    report.pop('minimum_1000_met', None)
    output.mkdir(parents=True, exist_ok=True)
    for filename, content in [('records.json', text), ('records.jsonl', ''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in rows)), ('collection-report.json', json.dumps(report, ensure_ascii=False, indent=2)+'\n')]:
        temp = output / (filename + '.tmp')
        temp.write_text(content, encoding='utf-8', newline='\n')
        temp.replace(output / filename)
    return report
