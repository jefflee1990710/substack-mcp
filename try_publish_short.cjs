const axios = require('axios');
const fs = require('fs');
const token = fs.readFileSync('/Users/jefflee/.hermes/config.yaml', 'utf8').match(/SUBSTACK_SESSION_TOKEN:\s*(.+)/)[1].replace(/['"]/g, '');

const session = axios.create({
  headers: {
    'Cookie': `substack.sid=${token}; connect.sid=${token};`,
    'origin': 'https://technerdclub.substack.com',
    'Content-Type': 'application/json'
  }
});

(async () => {
  try {
    const payload = {
      draft_title: '.',  // Substack requires a title. Let's use a single dot.
      draft_subtitle: '',
      draft_body: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a short post acting like a note.' }] }]
      }),
      draft_bylines: [{id: 137022120, is_guest: false}],
      hide_from_feed: false,
    };
    
    const res = await session.post('https://technerdclub.substack.com/api/v1/drafts', payload);
    const draftId = res.data.id;
    console.log('✅ Created draft:', draftId);
    
    const pubRes = await session.post(`https://technerdclub.substack.com/api/v1/drafts/${draftId}/publish`, {
      send: false, 
      share_automatically: false
    });
    console.log('✅ Published short post!', pubRes.status);
    
  } catch(e) {
    console.error('Error:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }
})();
