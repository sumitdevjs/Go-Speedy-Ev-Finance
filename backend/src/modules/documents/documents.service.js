const supabase = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const BUCKET_NAME = 'ev-documents';
const SIGNED_URL_EXPIRY = 900; // 15 minutes

class DocumentsService {
  async getDocumentsForTenant(tenantId) {
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('aadhar_path, pan_path, cheque_path, electricity_bill_path, tenant_photo_path, scooty_photo_path')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) throw new Error('Tenant not found');

    const result = {};

    for (const [key, path] of Object.entries(tenant)) {
      if (path) {
        const { data, error } = await supabase
          .storage
          .from(BUCKET_NAME)
          .createSignedUrl(path, SIGNED_URL_EXPIRY);

        if (data && !error) {
          result[key.replace('_path', '_url')] = data.signedUrl;
        }
      }
    }

    return result;
  }

  async uploadDocument(tenantId, docType, fileBuffer, fileMimetype) {
    // Determine extension based on mimetype
    let ext = 'webp';
    if (fileMimetype.includes('jpeg') || fileMimetype.includes('jpg')) ext = 'jpg';
    else if (fileMimetype.includes('png')) ext = 'png';
    else if (fileMimetype.includes('pdf')) ext = 'pdf'; // if allowed

    const filename = `${uuidv4()}.${ext}`;

    // 1. Check if an old file exists and delete it to save space
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select(docType) // e.g. aadhar_path
        .eq('id', tenantId)
        .single();

      if (tenant && tenant[docType]) {
        await supabase.storage.from(BUCKET_NAME).remove([tenant[docType]]);
      }
    }

    // 2. Upload new file
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType: fileMimetype,
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const newPath = uploadData.path;

    // 3. If tenantId is provided, save it directly to the database
    if (tenantId) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ [docType]: newPath })
        .eq('id', tenantId);

      if (updateError) throw updateError;
    }

    return { path: newPath };
  }
}

module.exports = new DocumentsService();
