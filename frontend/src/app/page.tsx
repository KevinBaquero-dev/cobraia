export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '16px',
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e40af' }}>
        CobraIA
      </h1>
      <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
        Facturación inteligente para Colombia
      </p>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
        cobraia.co — Módulo 1 activo ✅
      </p>
    </main>
  );
}