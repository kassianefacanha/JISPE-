const isAdminViewer = (user) => user?.type === 'admin'
  && ['admin', 'superadmin', 'gerencia'].includes(user.role);

const isAdminEditor = (user) => user?.type === 'admin'
  && ['admin', 'superadmin'].includes(user.role);

const adminViewerOnly = (req, res, next) => {
  if (!isAdminViewer(req.user)) {
    return res.status(403).json({ success: false, message: 'Acesso restrito à equipe administrativa.' });
  }
  return next();
};

const adminEditorOnly = (req, res, next) => {
  if (!isAdminEditor(req.user)) {
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  }
  return next();
};

module.exports = { adminEditorOnly, adminViewerOnly, isAdminEditor, isAdminViewer };