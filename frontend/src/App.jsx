import XRayAnalyzer from './XRayAnalyzer'

function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#0f6e56', marginBottom: '24px' }}>
          MedVLM · Radiology Report Generator
        </h1>
        <XRayAnalyzer />
      </div>
    </div>
  )
}

export default App