'use client';
import { useState } from 'react';

export default function Home() {
  const [urls, setUrls] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');

  const run = async () => {
    setLoading(true); setLog('');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urls.split(/\n| /).filter(Boolean), title, slug })
    });
    const json = await res.json();
    setLoading(false);
    if (json.error) setLog('❌ ' + json.error);
    else setLog('✅ 完了！ → ' + json.url);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Shopify Blog Generator</h1>
      <textarea
        style={{ width: '100%', height: 150 }}
        placeholder="商品URLを改行で貼る"
        value={urls}
        onChange={e => setUrls(e.target.value)}
      />
      <input placeholder="ブログタイトル" style={{ marginTop: 10, width: '100%', padding: 8 }} value={title} onChange={e=>setTitle(e.target.value)} />
      <input placeholder="スラッグ（任意）" style={{ marginTop: 10, width: '100%', padding: 8 }} value={slug} onChange={e=>setSlug(e.target.value)} />
      <button onClick={run} style={{ marginTop: 20, padding: 12 }}>
        {loading ? "生成中..." : "🚀 ブログ生成する"}
      </button>
      <pre style={{ marginTop: 20 }}>{log}</pre>
    </main>
  );
}
