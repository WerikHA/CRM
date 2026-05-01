import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { supabase } from "../lib/supabaseClient.ts";
import { encryptObject, decryptObject } from "../lib/encryption.ts";

export const facebookService = {
  getAuthUrl(clientId: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    
    if (!appId || !redirectUri) {
      throw new Error("Facebook App ID ou Redirect URI não configurado");
    }

    // Pass clientId as state to know which client these pages belong to
    const state = encodeURIComponent(clientId);
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";
    
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
  },

  async handleCallback(code: string, clientId: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      throw new Error("Credenciais do Facebook não configuradas");
    }

    // 1. Get User Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json() as any;
    
    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }
    
    const userAccessToken = tokenData.access_token;
    
    // 3. Get User's Pages and their tokens
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json() as any;
    
    const pages = pagesData.data || [];
    const instagramAccounts = [];
    
    // 4. Get Linked Instagram Accounts for these pages
    for (const page of pages) {
      const igUrl = `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
      const igRes = await fetch(igUrl);
      const igData = await igRes.json() as any;
      
      if (igData.instagram_business_account) {
        instagramAccounts.push({
          pageId: page.id,
          igAccountId: igData.instagram_business_account.id,
          pageName: page.name,
          accessToken: page.access_token
        });
      }
    }

    const tokens = {
      accessToken: userAccessToken,
      pages,
      instagramAccounts
    };

    // Store in Supabase securely
    const { data: clientData } = await supabase.from('clients').select('owner_id').eq('id', clientId).single();
    const ownerId = clientData?.owner_id || clientId;

    // Save to legacy system_configs for compatibility
    await supabase.from('system_configs').upsert({
      owner_id: ownerId,
      config_key: `facebook_tokens_${clientId}`,
      config_value: encryptObject(tokens),
      updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id,config_key' });

    // Save individual accounts to the new social_accounts table
    for (const page of pages) {
      await supabase.from('social_accounts').upsert({
        owner_id: ownerId,
        client_id: clientId,
        platform: 'facebook',
        platform_account_id: page.id,
        platform_account_name: page.name,
        access_token: encryptObject(page.access_token),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,platform_account_id' });
    }

    for (const ig of instagramAccounts) {
      await supabase.from('social_accounts').upsert({
        owner_id: ownerId,
        client_id: clientId,
        platform: 'instagram',
        platform_account_id: ig.igAccountId,
        platform_account_name: ig.pageName,
        access_token: encryptObject(ig.accessToken),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,platform_account_id' });
    }
    
    return { pages, instagramAccounts };
  },

  async getStoredData(clientId: string) {
    const { data: clientData } = await supabase.from('clients').select('owner_id').eq('id', clientId).single();
    if (!clientData) return null;

    const { data } = await supabase
      .from('system_configs')
      .select('config_value')
      .eq('owner_id', clientData.owner_id)
      .eq('config_key', `facebook_tokens_${clientId}`)
      .single();

    if (!data?.config_value) return null;
    return typeof data.config_value === 'string' ? decryptObject(data.config_value) : data.config_value;
  },

  async isConnected(clientId: string) {
    const data = await this.getStoredData(clientId);
    return !!data;
  },

  async getPages(clientId: string) {
    const data = await this.getStoredData(clientId);
    return data?.pages || [];
  },

  async getInstagramAccounts(clientId: string) {
    const data = await this.getStoredData(clientId);
    return data?.instagramAccounts || [];
  },

  async publishPost(clientId: string, networks: string[], content: string, mediaUrl?: string, scheduledTimeUnix?: number, selectedPageId?: string, selectedIgAccountId?: string) {
    const data = await this.getStoredData(clientId);
    if (!data) throw new Error("Cliente não possui contas conectadas");
    
    if (!data.pages.length && networks.includes("facebook")) throw new Error("Nenhuma página do Facebook encontrada conectada ao cliente.");
    if (!data.instagramAccounts.length && networks.includes("instagram")) throw new Error("Nenhuma conta do Instagram Business encontrada conectada ao cliente.");
    
    const results = [];
    
    if (networks.includes("facebook")) {
      const page = selectedPageId ? data.pages.find((p: any) => p.id === selectedPageId) || data.pages[0] : data.pages[0];
      let postUrl = `https://graph.facebook.com/v19.0/${page.id}/feed`;
      const body: any = {
        message: content,
        access_token: page.access_token
      };
      
      if (mediaUrl) {
        postUrl = `https://graph.facebook.com/v19.0/${page.id}/photos`;
        body.url = mediaUrl;
        body.caption = content;
        delete body.message;
      }
      
      if (scheduledTimeUnix) {
        body.published = false;
        body.scheduled_publish_time = scheduledTimeUnix;
      }
      
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      results.push({ network: "facebook", result });
    }
    
    if (networks.includes("instagram")) {
      const igAcc = selectedIgAccountId ? data.instagramAccounts.find((ig: any) => ig.igAccountId === selectedIgAccountId) || data.instagramAccounts[0] : data.instagramAccounts[0];
      if (!mediaUrl) {
         results.push({ network: "instagram", result: { error: { message: "Instagram exige uma imagem ou vídeo para publicar." } } });
      } else {
        const creationUrl = `https://graph.facebook.com/v19.0/${igAcc.igAccountId}/media`;
        const creationRes = await fetch(creationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: mediaUrl,
            caption: content,
            access_token: igAcc.accessToken
          })
        });
        const creationData = await creationRes.json() as any;
        
        if (creationData.id) {
          const publishUrl = `https://graph.facebook.com/v19.0/${igAcc.igAccountId}/media_publish`;
          const publishRes = await fetch(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: creationData.id,
              access_token: igAcc.accessToken
            })
          });
          const publishData = await publishRes.json();
          results.push({ network: "instagram", result: publishData });
        } else {
          results.push({ network: "instagram", result: creationData });
        }
      }
    }

    return results;
  },

  async disconnect(clientId: string) {
    const { data: clientData } = await supabase.from('clients').select('owner_id').eq('id', clientId).single();
    if (!clientData) return { success: false };

    await supabase.from('system_configs')
      .delete()
      .eq('owner_id', clientData.owner_id)
      .eq('config_key', `facebook_tokens_${clientId}`);
    
    return { success: true };
  },

  async disconnectAll(ownerId: string) {
    // Deleta todas as chaves que começam com facebook_tokens_ para este owner
    const { error } = await supabase.from('system_configs')
      .delete()
      .eq('owner_id', ownerId)
      .like('config_key', 'facebook_tokens_%');
    
    if (error) throw error;
    return { success: true };
  },

  async publishToSpecificAccount(account: any, content: string, mediaUrl?: string) {
    try {
      const accessToken = typeof account.access_token === 'string' && (account.access_token.includes(':') || account.access_token.length > 100) 
        ? decryptObject(account.access_token) 
        : account.access_token;

      if (account.platform === 'facebook') {
        let postUrl = `https://graph.facebook.com/v19.0/${account.platform_account_id}/feed`;
        const body: any = {
          message: content,
          access_token: accessToken
        };
        
        if (mediaUrl) {
          postUrl = `https://graph.facebook.com/v19.0/${account.platform_account_id}/photos`;
          body.url = mediaUrl;
          body.caption = content;
          delete body.message;
        }
        
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json() as any;
        if (data.error) throw new Error(data.error.message);
        return { success: true, data };
      } 
      
      if (account.platform === 'instagram') {
        if (!mediaUrl) throw new Error("Instagram exige uma imagem ou vídeo para publicar.");
        
        const creationUrl = `https://graph.facebook.com/v19.0/${account.platform_account_id}/media`;
        const creationRes = await fetch(creationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: mediaUrl,
            caption: content,
            access_token: accessToken
          })
        });
        const creationData = await creationRes.json() as any;
        if (creationData.error) throw new Error(creationData.error.message);
        
        if (creationData.id) {
          const publishUrl = `https://graph.facebook.com/v19.0/${account.platform_account_id}/media_publish`;
          const publishRes = await fetch(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: creationData.id,
              access_token: accessToken
            })
          });
          const publishData = await publishRes.json() as any;
          if (publishData.error) throw new Error(publishData.error.message);
          return { success: true, data: publishData };
        }
        throw new Error("Falha ao criar container de mídia no Instagram");
      }
      
      throw new Error(`Plataforma ${account.platform} não suportada`);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
