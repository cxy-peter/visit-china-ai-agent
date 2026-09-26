import hashlib,json,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from official_corpus_merge import merge_rows,save_refresh

def row(n, fetched=False, date='2026-09-25T00:00:00+00:00'):
    return {'id':str(n),'url':f'https://english.shanghai.gov.cn/article/{n}.html','city':'Shanghai','publisher':'english.shanghai.gov.cn','topics':['travel'],'retrieved_at':date,'fetch_status':200 if fetched else None,'content_sha256':'a'*64 if fetched else None,'operational_status':'requires_freshness_and_applicability_check' if fetched else 'body_not_fetched','discovered_on':'https://english.shanghai.gov.cn/','discovery_document_sha256':'b'*64,'extract_chars':120 if fetched else 0,'excerpt':''}

class IncrementalCorpus(unittest.TestCase):
    def test_smaller_batch_keeps_all_prior_urls_and_provenance(self):
        old=[row(i) for i in range(5)]
        new=[row(1,True,'2026-09-26T00:00:00+00:00'),row(5,True)]
        out=merge_rows(old,new)
        self.assertEqual(len(out),6)
        self.assertTrue({r['url'] for r in old}<={r['url'] for r in out})
        self.assertEqual(out[0],old[0])
        self.assertEqual(out[1]['id'],old[1]['id'])
        self.assertEqual(out[1]['discovered_on'],old[1]['discovered_on'])
        self.assertEqual(old[1]['fetch_status'],None)

    def test_failed_collection_preserves_index(self):
        old=[row(1),row(2,True)]
        self.assertEqual(merge_rows(old,[]),old)

    def test_refresh_does_not_reuse_approval_or_old_summary(self):
        old={**row(1,True),'summary':'obsolete','summaryZh':'旧答案','reviewedAt':'2026-09-25'}
        out=merge_rows([old],[row(1,True,'2026-09-26T00:00:00+00:00')])[0]
        self.assertNotIn('summary',out);self.assertNotIn('summaryZh',out);self.assertNotIn('reviewedAt',out)
        self.assertEqual(out['editorial_status'],'not_reviewed')

    def test_late_old_batch_cannot_replace_newer_observation(self):
        old=row(1,True,'2026-09-26T00:00:00+00:00')
        self.assertEqual(merge_rows([old],[row(1,True)]),[old])

    def test_saved_manifest_counts_hash_and_line_endings(self):
        with tempfile.TemporaryDirectory() as tmp:
            r=save_refresh(tmp,[row(1),row(2)],[row(1,True),row(3,True)],{'requested_target':3,'preserved_prior_rows':2},{'requested_target':2,'target_met':True})
            raw=(pathlib.Path(tmp)/'records.json').read_bytes()
            self.assertEqual(r['unique_index_urls'],3);self.assertEqual(r['unique_fetched_pages'],2);self.assertEqual(r['body_not_fetched'],1)
            self.assertEqual(r['last_batch_new_urls'],1);self.assertEqual(r['records_sha256'],hashlib.sha256(raw).hexdigest());self.assertNotIn(b'\r\n',raw)
            self.assertEqual(len(json.loads(raw)),3)

if __name__=='__main__':unittest.main()
