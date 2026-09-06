const express = require('express');
const documentsController = require('./documents.controller');
const requireAuth = require('../../middleware/auth');
const upload = require('../../middleware/uploadHandler');

const router = express.Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/documents/{tenantId}:
 *   get:
 *     summary: Get short-lived signed URLs for a tenant's documents
 *     tags: [Documents]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signed URLs
 */
router.get('/:tenantId', documentsController.getForTenant.bind(documentsController));

/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               doc_type:
 *                 type: string
 *               tenant_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Uploaded file path
 */
router.post(
  '/upload',
  upload.single('file'),
  documentsController.upload.bind(documentsController)
);

module.exports = router;
