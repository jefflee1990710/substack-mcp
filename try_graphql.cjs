const axios = require('axios');
const fs = require('fs');
const token = fs.readFileSync('/Users/jefflee/.hermes/config.yaml', 'utf8').match(/SUBSTACK_SESSION_TOKEN:\s*(.+)/)[1].replace(/['"]/g, '');

const session = axios.create({
  headers: {
    'Cookie': `substack.sid=${token}; connect.sid=${token};`,
    'origin': 'https://substack.com',
    'Content-Type': 'application/json'
  }
});

(async () => {
  try {
     const payload = {
        query: `mutation CreateNoteMutation($body: String!) { createNote(input: {body: $body}) { id } }`,
        variables: { body: "Hello GraphQL Note" }
     };
     const res = await session.post('https://substack.com/api/graphql', payload);
     console.log('✅ Created note via GQL', res.status, res.data);
  } catch(e) {
     console.error('Error note GQL:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }
})();
