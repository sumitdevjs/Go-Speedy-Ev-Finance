const supabase = require('../../config/db');
const crypto = require('crypto');
const { detectFileType } = require('../../utils/fileSignature');

const BUCKET_NAME = 'ev-documents';
const SIGNED_URL_EXPIRY = 900; // 15 minutes

class DocumentsService {
  async getDocumentsForTenant(tenantId) {
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('aadhar_path, pan_path, cheque_path, electricity_bill_path, tenant_photo_path, scooty_photo_path, rent_agreement_path, scooty_insurance_path, rider_insurance_path, rider_license_path, invoice_doc_path, amc_doc_path')
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
    // Content-Type is client-supplied and can't be trusted — verify by magic
    // bytes instead, and derive the extension/content-type from that.
    const verifiedType = detectFileType(fileBuffer);
    if (!verifiedType) {
      throw new Error('File content does not match an allowed format (JPEG, PNG, WEBP, or PDF).');
    }

    let ext = 'webp';
    if (verifiedType === 'image/jpeg') ext = 'jpg';
    else if (verifiedType === 'image/png') ext = 'png';
    else if (verifiedType === 'application/pdf') ext = 'pdf';

    const filename = `${crypto.randomUUID()}.${ext}`;

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
        contentType: verifiedType,
        upsert: true
      });

    if (uploadError) {
      console.error('[documents] Upload failed:', uploadError);
      throw new Error('Upload failed. Please try again.');
    }

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
