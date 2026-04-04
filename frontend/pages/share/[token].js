/**
 * Public share page — accessed via /share/:token
 * If user is authenticated → redirect to /editor/:id (full collaborative editor)
 * If user is not authenticated → show read-only document preview with login prompt
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SharePage() {
  const router = useRouter();
  const { token } = router.query;
  const [error, setError] = useState(false);
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    if (!token) return;

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${API}/api/documents/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(({ document }) => {
        // Check if user is authenticated (token stored in localStorage by Zustand persist)
        try {
          const auth = JSON.parse(localStorage.getItem('collabflow-auth') || '{}');
          const userToken = auth?.state?.token;
          if (userToken) {
            // Authenticated — go straight to the collaborative editor
            router.push(`/editor/${document._id}`);
            return;
          }
        } catch {}
        // Not authenticated — show the document preview with login prompt
        setDoc(document);
      })
      .catch(() => setError(true));
  }, [token]);

  const extractText = (content) => {
    if (!content || !content.content) return '';
    const lines = [];
    const walk = (nodes) => {
      for (const node of nodes || []) {
        if (node.text) lines.push(node.text);
        if (node.content) walk(node.content);
      }
    };
    walk(content.content);
    return lines.join(' ').slice(0, 400);
  };

  return (
    <>
      <Head>
        <title>{doc ? `${doc.title} — CollabFlow` : 'CollabFlow — Shared Document'}</title>
      </Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080812', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'DM Sans, sans-serif', maxWidth: 520, width: '100%' }}>
          {error ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Shared document not found or link has expired.</p>
              <button
                onClick={() => router.push('/')}
                style={{ marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg,#6771f1,#a855f7)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 14 }}>
                Go Home
              </button>
            </>
          ) : !doc ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading shared document…</p>
              <div style={{ marginTop: 16, width: 40, height: 40, border: '3px solid rgba(103,113,241,0.3)', borderTopColor: '#6771f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '16px auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              {/* Document card preview */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, marginBottom: 24, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 52, background: 'rgba(103,113,241,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📄</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{doc.title || 'Untitled Document'}</h2>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                      Shared by <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{doc.owner?.username}</strong>
                    </p>
                  </div>
                </div>
                {extractText(doc.content) && (
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                    {extractText(doc.content)}…
                  </p>
                )}
              </div>

              {/* Auth prompt */}
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 20 }}>
                Sign in to open the full document and collaborate in real-time.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => router.push(`/auth?redirect=/share/${token}`)}
                  style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#6771f1,#a855f7)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  Sign in to edit
                </button>
                <button
                  onClick={() => router.push('/')}
                  style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>
                  Go Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
