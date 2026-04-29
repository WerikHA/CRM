import { google } from 'googleapis';
import fs from 'fs';
import { supabase } from '../lib/supabaseClient.ts';
import { encryptObject, decryptObject } from '../lib/encryption.ts';

// These should be set in environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

export const googleDriveService = {
  getAuthUrl(userId: string) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive'
      ],
      state: userId, // Pass userId as state to know who is connecting
      prompt: 'consent'
    });
  },

  async saveTokens(userId: string, code: string) {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Get ownerId for this user to store config at agency level
    const { data: userData } = await supabase.from('users').select('owner_id').eq('id', userId).single();
    const ownerId = userData?.owner_id || userId;

    await supabase.from('system_configs').upsert({
      owner_id: ownerId,
      config_key: 'google_tokens',
      config_value: encryptObject(tokens),
      updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id,config_key' });

    return tokens;
  },

  async getTokens(userId: string) {
    const { data: userData } = await supabase.from('users').select('owner_id').eq('id', userId).single();
    const ownerId = userData?.owner_id || userId;

    const { data } = await supabase
      .from('system_configs')
      .select('config_value')
      .eq('owner_id', ownerId)
      .eq('config_key', 'google_tokens')
      .single();

    if (!data?.config_value) return null;
    
    // If it's already an object (legacy), encryptObject will handle it or we return as is
    // But decryptObject expects a string from AES
    if (typeof data.config_value === 'string') {
      return decryptObject(data.config_value);
    }
    return data.config_value;
  },

  async getClient(userId: string) {
    const tokens = await this.getTokens(userId);
    if (!tokens) throw new Error('User not connected to Google Drive');

    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    oauth2Client.setCredentials(tokens);

    // Refresh token if needed
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        const { data: userData } = await supabase.from('users').select('owner_id').eq('id', userId).single();
        const ownerId = userData?.owner_id || userId;
        
        const currentTokens = await this.getTokens(userId);
        await supabase.from('system_configs').upsert({
          owner_id: ownerId,
          config_key: 'google_tokens',
          config_value: encryptObject({ ...currentTokens, ...newTokens }),
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id,config_key' });
      } catch (err) {
        console.error('[GOOGLE DRIVE] Erro ao atualizar tokens no evento:', err);
      }
    });

    return oauth2Client;
  },

  async listFiles(userId: string, folderId: string = 'root') {
    const auth = await this.getClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, iconLink, size, modifiedTime)',
      orderBy: 'folder,name',
    });

    return response.data.files;
  },

  async uploadFile(userId: string, file: any, parentId: string = 'root') {
    const auth = await this.getClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: file.originalname,
      parents: [parentId],
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    return response.data;
  },

  async downloadFile(userId: string, fileId: string) {
    const auth = await this.getClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data;
  },

  async deleteFile(userId: string, fileId: string) {
    const auth = await this.getClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId });
    return { success: true };
  },

  async generateShareLink(userId: string, fileId: string) {
    const auth = await this.getClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    // Ensure the file is shared with "anyone with the link"
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const response = await drive.files.get({
      fileId,
      fields: 'webViewLink',
    });

    return response.data.webViewLink;
  },

  async isConnected(userId: string) {
    return !!(await this.getTokens(userId));
  },

  async disconnect(userId: string) {
    const { data: userData } = await supabase.from('users').select('owner_id').eq('id', userId).single();
    const ownerId = userData?.owner_id || userId;
    await supabase.from('system_configs').delete().eq('owner_id', ownerId).eq('config_key', 'google_tokens');
    return { success: true };
  }
};
