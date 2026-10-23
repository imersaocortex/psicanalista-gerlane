// Accept legacy values accidentally encoded as JSON strings several times.
export function configValue(value) {
  let result = value;
  for (let i = 0; i < 5 && typeof result === 'string'; i++) {
    try { const decoded = JSON.parse(result); if (decoded === result) break; result = decoded; }
    catch { break; }
  }
  return result;
}
