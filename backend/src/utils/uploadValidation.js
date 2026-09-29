const maxAssetBytes = 3 * 1024 * 1024;
const dataUrlPattern = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const validateUploadedAsset = (value, kind) => {
  if (typeof value !== 'string' || !value.trim()) {
    return `O arquivo de ${kind === 'photo' ? 'foto' : 'comprovante'} é obrigatório.`;
  }

  const asset = value.trim();
  if (asset.startsWith('data:')) {
    const match = asset.match(dataUrlPattern);
    const allowedTypes = kind === 'photo' ? imageTypes : new Set([...imageTypes, 'application/pdf']);
    if (!match || !allowedTypes.has(match[1].toLowerCase())) {
      return kind === 'photo'
        ? 'A foto precisa estar em JPG, PNG ou WebP.'
        : 'O comprovante precisa estar em JPG, PNG, WebP ou PDF.';
    }

    const byteLength = Buffer.from(match[2], 'base64').length;
    if (byteLength > maxAssetBytes) {
      return 'Cada arquivo pode ter no máximo 3 MiB.';
    }
    return null;
  }

  return 'Envie o arquivo selecionado; URLs externas não são aceitas para novos documentos.';
};

module.exports = { validateUploadedAsset };