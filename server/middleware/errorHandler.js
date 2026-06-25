/**
 * middleware/errorHandler.js
 * Gestion globale des erreurs Express
 */
const errorHandler = (err, req, res, next) => {
  console.error('🔴 Error:', err.stack || err.message);

  // Erreurs de validation express-validator
  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Données invalides',
      errors: err.errors
    });
  }

  // Erreurs MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Cette valeur existe déjà (doublon)'
    });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Erreur serveur interne';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
