const supabase = require('../config/db');

/**
 * Middleware to log mutating requests to audit_logs
 * Note: Should be used AFTER auth middleware so req.user is available
 * and AFTER the route handler has completed (using res.on('finish'))
 * However, we need to know the entity_id and changes. 
 * Often it's easier to explicitly log within the service, but if done here,
 * we need to attach data to req or res.
 * For now, this is a placeholder that can be hooked up if we use a generic approach,
 * or we can create a utility function `logAudit` that services call directly.
 */
const requestLogger = (entityType, actionFn) => {
  return async (req, res, next) => {
    // Capture the original send to intercept the response
    const originalSend = res.json;
    
    res.json = function (body) {
      res.locals.body = body;
      originalSend.call(this, body);
    };

    res.on('finish', async () => {
      // Only log successful mutating requests
      if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        if (!req.user) return; // Need auth

        try {
          const action = typeof actionFn === 'function' ? actionFn(req) : actionFn;
          
          // Try to extract entity_id from response or request
          const entityId = res.locals.body?.data?.id || req.params.id || null;
          
          // Determine changes - rudimentary: just store req.body (sanitize secrets!)
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
          // Don't crash the request if logging fails, it already finished.
        }
      }
    });

    next();
  };
};

module.exports = requestLogger;
