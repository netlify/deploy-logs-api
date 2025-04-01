# Example for fetching Netlify logs

This is an example of how to fetch Netlify logs for a given deploy.

## How to run

```bash
NETLIFY_ACCESS_CONTROL_TOKEN="netlify_access_token" npm run start
```

## Websocket payload interface

Initial connection:

```js
const ws = new WebSocket(`ws://wss://socketeer.services.netlify.com/${path}`);
ws.addEventListener("open", () => {
  getAccessControlToken()
    .then((accessToken) => {
      ws.send(JSON.stringify({ ...logsPayload, access_token: accessToken }));
    })
    .catch((error) => {...});
});
...

```

### Deploy logs

path: `/deploy/logs`

payload:

```ts
type Payload = {
  access_token: string,
  deploy_id: string,
  site_id: string
}
```

### Function logs

path: `/function/logs`

payload:

```ts
type Payload = {
  access_token: string,
  account_id: string,
  function_id: string,
  site_id: string,
  from?: string,
  to?: string
}
```

### Edge function logs

path: `/edge-function/logs`

payload:

```ts
type Payload = {
  access_token: string,
  deploy_id: string,
  site_id: string,
  since: string,
}
```
