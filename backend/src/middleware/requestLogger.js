const supabase = require('../config/db');

const requestLogger = (entityType, actionFn) => {
  return async (req, res, next) => {
    const originalSend = res.json;
    
    res.json = function (body) {
      res.locals.body = body;
      originalSend.call(this, body);
    };

    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        if (!req.user) return;

        try {
          const action = typeof actionFn === 'function' ? actionFn(req) : actionFn;
          const entityId = res.locals.body?.data?.id || req.params.id || null;
          
          let changes = { ...req.body };
          delete changes.password;
          delete changes.password_hash;
          delete changes.refresh_token_hash;

          await supabase.from('audit_logs').insert([{
            user_id: req.user.id,
            user_role: req.user.role,
            action: action || req.method,
            entity_type: entityType,
            entity_id: entityId,
            changes: changes,
            ip_address: req.ip || req.headers['x-forwarded-for'],
          }]);
        } catch (error) {
          console.error('[Audit Logger Error]', error);
        }
      }
    });

    next();
  };
};

module.exports = requestLogger;
