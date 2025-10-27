const http = require('http');

function req(options, body){
  return new Promise((resolve,reject)=>{
    const r = http.request(options, res=>{
      let data='';
      res.on('data', c=> data+=c);
      res.on('end', ()=>{
        try{ const parsed = JSON.parse(data || '{}'); resolve({status: res.statusCode, body: parsed}); }
        catch(e){ resolve({status: res.statusCode, body: data}); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main(){
  // 1) login as alice
  const login = await req({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'alice@example.com', password: 'password' });
  if (login.status !== 200){ console.error('Login failed', login); process.exit(1); }
  const token = login.body.token;
  console.log('Logged in as:', login.body.user.name, 'token length:', token?.length);

  // 2) get users and find someone else
  const usersRes = await req({ hostname: 'localhost', port: 5000, path: '/api/users', method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
  if (usersRes.status !== 200){ console.error('Failed to get users', usersRes); process.exit(1); }
  const users = usersRes.body;
  const me = JSON.parse(JSON.stringify(login.body.user));
  const other = users.find(u => u.email !== me.email);
  if (!other){ console.error('No other user found'); process.exit(1); }
  console.log('Found other user:', other.name, other._id);

  // 3) send a demo message
  const content = 'Demo message from script at ' + new Date().toISOString();
  const sendRes = await req({ hostname: 'localhost', port: 5000, path: '/api/messages', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } }, { to: other._id, content });
  console.log('Send response status:', sendRes.status);
  console.log('Message created:', sendRes.body);
}

main().catch(err=>{ console.error(err); process.exit(1); });
