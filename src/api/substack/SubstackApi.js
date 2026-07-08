import axios from 'axios';

export default class SubstackApi {
  constructor({
                email = null,
                password = null,
                base_url = null,
                publication_url = null,
                auth_token = null
              }) {
    this.email = email;
    this.password = password;
    this.base_url = base_url || 'https://substack.com/api/v1';
    this.publication_url = publication_url ? new URL('api/v1', publication_url).toString() : null;
    this.hostname = publication_url;
    this.auth_cookie = `substack.sid=${auth_token}; connect.sid=${auth_token};`;

    this.session = axios.create({
      headers: {
        'Cookie': this.auth_cookie,
        'referer': this.hostname ? `${this.hostname}/publish/settings` : 'https://substack.com',
        'Content-Type': 'application/json'
      }
    });
  }

  static handleResponse(response) {
    if (!(response.status >= 200 && response.status < 300)) {
      throw new Error(`SubstackAPIException: ${response.status} ${response.statusText}`);
    }
    return response.data;
  }

  // --- Posts & Drafts ---

  async postDraft(body) {
    const url = `${this.publication_url}/drafts`;
    const response = await this.session.post(url, body);
    return SubstackApi.handleResponse(response);
  }

  async getDrafts(offset = 0, limit = 20) {
    const url = `${this.publication_url}/drafts`;
    const response = await this.session.get(url, { params: { offset, limit } });
    return SubstackApi.handleResponse(response);
  }

  async getPublishedPosts(offset = 0, limit = 20) {
    const url = `${this.publication_url}/post_management/published`;
    const response = await this.session.get(url, { params: { offset, limit } });
    return SubstackApi.handleResponse(response);
  }

  async deleteDraft(draftId) {
    const url = `${this.publication_url}/drafts/${draftId}`;
    const response = await this.session.delete(url);
    return SubstackApi.handleResponse(response);
  }

  async updateDraft(draftId, body) {
    const url = `${this.publication_url}/drafts/${draftId}`;
    const response = await this.session.put(url, body);
    return SubstackApi.handleResponse(response);
  }

  async publishDraft(draftId, send = true, share_automatically = false) {
    const url = `${this.publication_url}/drafts/${draftId}/publish`;
    const response = await this.session.post(url, { send, share_automatically });
    return SubstackApi.handleResponse(response);
  }

  // --- Publication Tags & Categories ---

  async getPublicationPostTags() {
    const url = `${this.publication_url}/post_tags`;
    const response = await this.session.get(url);
    return SubstackApi.handleResponse(response);
  }

  async createPostTag(tagName) {
    const url = `${this.publication_url}/publication/post-tag`;
    const response = await this.session.post(url, { name: tagName });
    return SubstackApi.handleResponse(response);
  }

  async addTagToPost(postId, tagId) {
    const url = `${this.publication_url}/post/${postId}/tag/${tagId}`;
    const response = await this.session.post(url, {});
    return SubstackApi.handleResponse(response);
  }

  // --- Publication Profile ---

  async getPublication() {
    const url = `${this.publication_url.replace('/api/v1', '')}/api/v1/publication`;
    const response = await this.session.get(url);
    return SubstackApi.handleResponse(response);
  }

  async updatePublication(updateData) {
    const url = `${this.publication_url.replace('/api/v1', '')}/api/v1/publication`;
    const response = await this.session.put(url, updateData);
    return SubstackApi.handleResponse(response);
  }

  async getUserProfile() {
    const url = `${this.base_url}/user/profile/self`;
    const response = await this.session.get(url);
    return SubstackApi.handleResponse(response);
  }

  // Uploads an image to Substack's media store and returns { id, url, ... }.
  // `image` may be a base64 data URL or a public http(s) URL; Substack rehosts
  // it to its own S3 bucket. Profile photos and publication logos must point at
  // a Substack-hosted URL (an arbitrary external URL does not render), so callers
  // should route images through here before setting photo_url / logo_url.
  async uploadImage(image) {
    const url = `${this.base_url}/image`;
    const response = await this.session.post(url, { image }, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return SubstackApi.handleResponse(response);
  }

  async updateUserProfile(updateData) {
    const url = `${this.base_url}/user/profile`;
    const response = await this.session.put(url, updateData);
    return SubstackApi.handleResponse(response);
  }

  // --- Reader feed (Notes home, profile activity, threads) ---

  async getReaderFeed({ tab, cursor, limit } = {}) {
    const params = {};
    if (tab) params.tab = tab;
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;
    const response = await this.session.get(`${this.base_url}/reader/feed`, {
      params,
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async getReaderFeedTabs() {
    const response = await this.session.get(`${this.base_url}/reader/feed/tabs`, {
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async getProfileFeed(userId, { cursor, limit } = {}) {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;
    const response = await this.session.get(`${this.base_url}/reader/feed/profile/${userId}`, {
      params,
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async getComment(commentId) {
    const response = await this.session.get(`${this.base_url}/reader/comment/${commentId}`, {
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async getCommentReplies(commentId) {
    const response = await this.session.get(`${this.base_url}/reader/comment/${commentId}/replies`, {
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async restackFeedItem({ postId = null, commentId = null, tabId = 'for-you' } = {}) {
    const response = await this.session.post(`${this.base_url}/restack/feed`, {
      postId,
      commentId,
      tabId,
      surface: 'feed',
    }, {
      headers: { referer: 'https://substack.com/notes' },
    });
    return SubstackApi.handleResponse(response);
  }

  async getPostComments(postId, { limit = 50 } = {}) {
    const url = `${this.publication_url}/post/${postId}/comments`;
    const response = await this.session.get(url, { params: { all_comments: true, limit } });
    return SubstackApi.handleResponse(response);
  }

  async commentOnPost(postId, body) {
    const url = `${this.publication_url}/post/${postId}/comment`;
    const response = await this.session.post(url, { body });
    return SubstackApi.handleResponse(response);
  }
}
