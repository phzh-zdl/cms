import { useState } from 'react';
import { buildExportZip } from '../export/buildZip.js';
import { downloadBlob } from '../export/download.js';

export default function ExportPanel({ site, client, dirty }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  async function create() {
    setBusy(true); setError(null); setSuccess(null); setProgress(null);
    try {
      const { blob, fileName } = await buildExportZip(client, site.repo, site.config, { onProgress: setProgress });
      downloadBlob(blob, fileName);
      setSuccess(`ZIP erstellt: ${fileName}`);
    } catch (e) {
      setError(e.message || 'Das ZIP konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="export-panel">
      <h1>Exportieren</h1>
      <p>Erstellt ein ZIP mit der fertigen Seite und allen gespeicherten Inhalten. Dieses ZIP geht ans Webcenter bzw. auf den PH-Server.</p>
      <button type="button" disabled={dirty || busy} onClick={create}>ZIP erstellen</button>
      {dirty && <p role="status" className="note">Bitte zuerst speichern.</p>}
      <p aria-live="polite">
        {busy && progress ? `Dateien werden geladen … ${progress.done} von ${progress.total}` : ''}
      </p>
      {success && <p role="status">{success}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
